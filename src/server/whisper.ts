import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";

export interface WhisperNativeAddon {
	isWhisperAvailable: () => boolean;
	getDefaultModelDir: () => string;
	getDefaultModelPath: () => string;
	checkModelExists: (customPath?: string) => boolean;
	resolveModelPath: (customPath?: string) => string | null;
	transcribePcm16: (
		audioBuffer: Buffer,
		modelPath?: string,
		language?: string,
	) => Promise<string>;
	transcribeF32: (
		samples: number[],
		modelPath?: string,
		language?: string,
	) => Promise<string>;
}

let addonInstance: WhisperNativeAddon | null = null;
let loadAttempted = false;

export function getWhisperAddon(): WhisperNativeAddon | null {
	if (loadAttempted) return addonInstance;
	loadAttempted = true;

	const metaDir = typeof import.meta.dirname === "string" ? import.meta.dirname : "";
	const candidatePaths = [
		path.resolve(process.cwd(), "native", "whisper.node"),
		path.resolve(process.cwd(), "crates", "whisper-napi", "target", "release", "libwhisper_napi.so"),
		path.resolve(process.cwd(), "crates", "whisper-napi", "target", "release", "libwhisper_napi.dylib"),
		path.resolve(process.cwd(), "crates", "whisper-napi", "target", "release", "whisper_napi.dll"),
		path.resolve(process.cwd(), ".next", "standalone", "native", "whisper.node"),
		...(metaDir ? [
			path.resolve(metaDir, "..", "..", "native", "whisper.node"),
			path.resolve(metaDir, "native", "whisper.node"),
		] : []),
	];

	for (const candidate of candidatePaths) {
		if (fs.existsSync(candidate)) {
			try {
				const mod = { exports: {} as Partial<WhisperNativeAddon> };
				process.dlopen(mod, candidate);
				if (typeof mod.exports.transcribePcm16 === "function") {
					addonInstance = mod.exports as WhisperNativeAddon;
					return addonInstance;
				}
			} catch (err) {
				console.warn(`[whisper] error loading addon at ${candidate}:`, err);
			}
		}
	}

	return null;
}

export function isWhisperAvailable(): boolean {
	const addon = getWhisperAddon();
	return addon ? addon.isWhisperAvailable() : false;
}

export function getDefaultModelPath(): string {
	const addon = getWhisperAddon();
	if (addon) return addon.getDefaultModelPath();
	const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
	return path.join(home, ".cache", "learnharness", "models", "ggml-small.bin");
}

export function checkWhisperModelExists(customPath?: string): boolean {
	const addon = getWhisperAddon();
	if (addon) return addon.checkModelExists(customPath);
	const target = customPath ?? getDefaultModelPath();
	return fs.existsSync(target);
}

export function resolveWhisperModelPath(customPath?: string): string | null {
	const addon = getWhisperAddon();
	if (addon) return addon.resolveModelPath(customPath);
	const target = customPath ?? getDefaultModelPath();
	return fs.existsSync(target) ? target : null;
}

export async function transcribePcm16(
	audioBuffer: Buffer,
	modelPath?: string,
	language: string = "es",
): Promise<string> {
	const addon = getWhisperAddon();
	if (!addon) {
		throw new Error("Módulo nativo de Whisper en Rust no está disponible.");
	}
	return addon.transcribePcm16(audioBuffer, modelPath, language);
}

export const WHISPER_SMALL_URL =
	"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin";

/**
 * Descarga el modelo GGML de Whisper small (~466MB) si no existe.
 */
export async function downloadWhisperModel(
	targetPath: string = getDefaultModelPath(),
	onProgress?: (downloaded: number, total: number) => void,
): Promise<string> {
	if (fs.existsSync(targetPath)) {
		return targetPath;
	}

	const dir = path.dirname(targetPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const tempPath = `${targetPath}.tmp-${Date.now()}`;

	return new Promise((resolve, reject) => {
		function get(url: string, redirects = 0) {
			if (redirects > 10) {
				return reject(new Error("Demasiadas redirecciones al descargar modelo"));
			}
			let parsedUrl: URL;
			try {
				parsedUrl = new URL(url);
			} catch (e) {
				return reject(new Error(`URL inválida para descarga de modelo: ${url}`));
			}
			const client = parsedUrl.protocol === "https:" ? https : http;
			client.get(parsedUrl, (res) => {
				if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					const nextUrl = new URL(res.headers.location, url).toString();
					return get(nextUrl, redirects + 1);
				}
				if (res.statusCode !== 200) {
					return reject(new Error(`Error descargando modelo (${res.statusCode})`));
				}

				const total = parseInt(res.headers["content-length"] || "0", 10);
				let downloaded = 0;
				const fileStream = fs.createWriteStream(tempPath);

				res.on("data", (chunk: Buffer) => {
					downloaded += chunk.length;
					if (onProgress) onProgress(downloaded, total);
				});

				res.pipe(fileStream);

				fileStream.on("finish", () => {
					fileStream.close(() => {
						try {
							fs.renameSync(tempPath, targetPath);
							resolve(targetPath);
						} catch (e) {
							reject(e);
						}
					});
				});

				fileStream.on("error", (err) => {
					try {
						if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
					} catch {}
					reject(err);
				});
			}).on("error", (err) => {
				try {
					if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
				} catch {}
				reject(err);
			});
		}

		get(WHISPER_SMALL_URL);
	});
}
