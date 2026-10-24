import {
	isWhisperAvailable,
	checkWhisperModelExists,
	getDefaultModelPath,
	resolveWhisperModelPath,
	downloadWhisperModel,
	WHISPER_SMALL_URL,
} from "@/src/server";

export async function GET() {
	const available = isWhisperAvailable();
	const modelExists = checkWhisperModelExists();
	const defaultPath = getDefaultModelPath();
	const resolvedPath = resolveWhisperModelPath();

	return Response.json({
		available,
		modelExists,
		defaultModelPath: defaultPath,
		resolvedPath,
		downloadUrl: WHISPER_SMALL_URL,
	});
}

export async function POST() {
	if (!isWhisperAvailable()) {
		return Response.json(
			{ error: "Whisper native addon no disponible" },
			{ status: 503 },
		);
	}

	try {
		const targetPath = getDefaultModelPath();
		const finalPath = await downloadWhisperModel(targetPath);
		return Response.json({
			success: true,
			modelPath: finalPath,
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return Response.json(
			{ error: `Fallo al descargar modelo: ${msg}` },
			{ status: 500 },
		);
	}
}
