import { NextRequest } from "next/server";
import {
	transcribePcm16,
	checkWhisperModelExists,
	getDefaultModelPath,
	isWhisperAvailable,
	resolveWhisperModelPath,
	effectiveSettings,
} from "@/src/server";

export async function POST(req: NextRequest) {
	if (!isWhisperAvailable()) {
		return Response.json(
			{
				error: "El módulo nativo Whisper en Rust no está compilado o disponible en esta plataforma.",
			},
			{ status: 503 },
		);
	}

	const resolvedPath = resolveWhisperModelPath();
	if (!resolvedPath) {
		const expected = getDefaultModelPath();
		return Response.json(
			{
				error: `Modelo Whisper no encontrado. Coloca el modelo 'ggml-small.bin' en '${expected}' o define WHISPER_MODEL_PATH.`,
				defaultModelPath: expected,
			},
			{ status: 404 },
		);
	}

	try {
		const contentType = req.headers.get("content-type") || "";
		let audioBuffer: Buffer;
		let language: string = effectiveSettings().general?.language ?? "es";

		if (contentType.includes("application/json")) {
			const body = await req.json();
			if (body.language) language = body.language;

			if (typeof body.audio === "string") {
				// Base64 encoded audio
				audioBuffer = Buffer.from(body.audio, "base64");
			} else if (Array.isArray(body.audio)) {
				// Array of 16-bit PCM numbers
				const int16 = new Int16Array(body.audio);
				audioBuffer = Buffer.from(int16.buffer);
			} else {
				return Response.json(
					{ error: "Campo 'audio' faltante o inválido (se esperaba base64 o array de muestras)." },
					{ status: 400 },
				);
			}
		} else {
			// Raw octet-stream
			const arrayBuffer = await req.arrayBuffer();
			audioBuffer = Buffer.from(arrayBuffer);
			const urlLang = req.nextUrl.searchParams.get("lang");
			if (urlLang) language = urlLang;
		}

		if (audioBuffer.length < 2) {
			return Response.json({ text: "" });
		}

		const text = await transcribePcm16(audioBuffer, resolvedPath, language);
		return Response.json({ text });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return Response.json(
			{ error: `Error durante la transcripción: ${msg}` },
			{ status: 500 },
		);
	}
}
