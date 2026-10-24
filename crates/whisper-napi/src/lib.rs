#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::*;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

static CACHED_CONTEXT: Mutex<Option<(PathBuf, WhisperContext)>> = Mutex::new(None);

#[napi]
pub fn is_whisper_available() -> bool {
    true
}

#[napi]
pub fn get_default_model_dir() -> String {
    if let Some(mut cache) = dirs::cache_dir() {
        cache.push("learnharness");
        cache.push("models");
        cache.to_string_lossy().to_string()
    } else {
        "./data/models".to_string()
    }
}

#[napi]
pub fn get_default_model_path() -> String {
    let mut dir = PathBuf::from(get_default_model_dir());
    dir.push("ggml-small.bin");
    dir.to_string_lossy().to_string()
}

#[napi]
pub fn resolve_model_path(custom_path: Option<String>) -> Option<String> {
    // 1. Explicit path if passed
    if let Some(ref path) = custom_path {
        let p = Path::new(path);
        if p.exists() && p.is_file() {
            return Some(p.to_string_lossy().to_string());
        }
        return None;
    }

    // 2. WHISPER_MODEL_PATH env
    if let Ok(env_path) = std::env::var("WHISPER_MODEL_PATH") {
        let p = Path::new(&env_path);
        if p.exists() && p.is_file() {
            return Some(p.to_string_lossy().to_string());
        }
    }

    // 3. User cache directory: ~/.cache/learnharness/models/ggml-small.bin
    let default_path = PathBuf::from(get_default_model_path());
    if default_path.exists() && default_path.is_file() {
        return Some(default_path.to_string_lossy().to_string());
    }

    // 4. Local workspace directory: ./data/models/ggml-small.bin
    let local_path = PathBuf::from("./data/models/ggml-small.bin");
    if local_path.exists() && local_path.is_file() {
        return Some(local_path.to_string_lossy().to_string());
    }

    // 5. Check for base or tiny fallbacks if small not found
    let fallbacks = [
        "ggml-small.bin",
        "ggml-base.bin",
        "ggml-tiny.bin",
        "ggml-medium.bin",
    ];
    let base_cache = PathBuf::from(get_default_model_dir());
    for fb in &fallbacks {
        let p = base_cache.join(fb);
        if p.exists() && p.is_file() {
            return Some(p.to_string_lossy().to_string());
        }
        let lp = PathBuf::from("./data/models").join(fb);
        if lp.exists() && lp.is_file() {
            return Some(lp.to_string_lossy().to_string());
        }
    }

    None
}

#[napi]
pub fn check_model_exists(custom_path: Option<String>) -> bool {
    resolve_model_path(custom_path).is_some()
}

fn get_or_load_context(model_path_str: &str) -> std::result::Result<(), String> {
    let target_path = PathBuf::from(model_path_str);
    let mut lock = CACHED_CONTEXT.lock().map_err(|e| e.to_string())?;
    if let Some((ref cached_path, _)) = *lock {
        if cached_path == &target_path {
            return Ok(());
        }
    }

    // Load new context
    let ctx_params = WhisperContextParameters::default();
    let ctx = WhisperContext::new_with_params(model_path_str, ctx_params)
        .map_err(|e| format!("Failed to load Whisper model from {}: {:?}", model_path_str, e))?;

    *lock = Some((target_path, ctx));
    Ok(())
}

fn run_transcription(samples: &[f32], model_path: Option<String>, language: Option<String>) -> std::result::Result<String, String> {
    if samples.is_empty() {
        return Ok(String::new());
    }

    let resolved_model = resolve_model_path(model_path.clone())
        .ok_or_else(|| {
            format!(
                "Whisper model not found. Expected at {} or specified via WHISPER_MODEL_PATH.",
                get_default_model_path()
            )
        })?;

    get_or_load_context(&resolved_model)?;

    let lock = CACHED_CONTEXT.lock().map_err(|e| e.to_string())?;
    let (_, ref ctx) = lock.as_ref().ok_or_else(|| "No Whisper context cached".to_string())?;

    let mut state = ctx.create_state().map_err(|e| format!("Failed to create Whisper state: {:?}", e))?;

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    let lang = language.as_deref().unwrap_or("es");
    params.set_language(Some(lang));
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_translate(false);

    let threads = std::thread::available_parallelism()
        .map(|n| n.get() as i32)
        .unwrap_or(4)
        .clamp(1, 8);
    params.set_n_threads(threads);

    state.full(params, samples).map_err(|e| format!("Whisper transcription failed: {:?}", e))?;

    let mut full_text = String::new();
    for segment in state.as_iter() {
        let text = segment.to_string();
        full_text.push_str(&text);
    }

    Ok(full_text.trim().to_string())
}

#[napi]
pub async fn transcribe_pcm16(
    audio_buffer: Buffer,
    model_path: Option<String>,
    language: Option<String>,
) -> Result<String> {
    let bytes = audio_buffer.as_ref().to_vec();
    if bytes.len() < 2 {
        return Ok(String::new());
    }

    let sample_count = bytes.len() / 2;
    let mut samples = Vec::with_capacity(sample_count);
    for chunk in bytes.chunks_exact(2) {
        let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
        samples.push(sample as f32 / 32768.0);
    }

    tokio::task::spawn_blocking(move || {
        run_transcription(&samples, model_path, language)
    })
    .await
    .map_err(|e| Error::new(Status::GenericFailure, format!("Task join error: {}", e)))?
    .map_err(|e| Error::new(Status::GenericFailure, e))
}

#[napi]
pub async fn transcribe_f32(
    samples: Vec<f64>,
    model_path: Option<String>,
    language: Option<String>,
) -> Result<String> {
    if samples.is_empty() {
        return Ok(String::new());
    }

    let f32_samples: Vec<f32> = samples.into_iter().map(|s| s as f32).collect();

    tokio::task::spawn_blocking(move || {
        run_transcription(&f32_samples, model_path, language)
    })
    .await
    .map_err(|e| Error::new(Status::GenericFailure, format!("Task join error: {}", e)))?
    .map_err(|e| Error::new(Status::GenericFailure, e))
}
