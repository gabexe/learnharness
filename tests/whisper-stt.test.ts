import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isWhisperAvailable,
	getDefaultModelPath,
	checkWhisperModelExists,
	resolveWhisperModelPath,
	getWhisperAddon,
} from "../src/server/whisper.ts";

describe("Whisper native Rust STT addon", () => {
	it("loads the native addon successfully", () => {
		const addon = getWhisperAddon();
		assert.ok(addon !== null, "addon should load via process.dlopen");
		assert.equal(typeof addon?.transcribePcm16, "function");
		assert.equal(typeof addon?.transcribeF32, "function");
		assert.equal(typeof addon?.isWhisperAvailable, "function");
	});

	it("reports isWhisperAvailable as true", () => {
		assert.equal(isWhisperAvailable(), true);
	});

	it("returns a sensible default model path for small GGML model", () => {
		const modelPath = getDefaultModelPath();
		assert.ok(typeof modelPath === "string");
		assert.ok(modelPath.endsWith("ggml-small.bin"));
	});

	it("handles checkWhisperModelExists and resolveWhisperModelPath safely", () => {
		// Non-existent custom path should return false / null
		const nonExistent = "/non/existent/model.bin";
		assert.equal(checkWhisperModelExists(nonExistent), false);
		assert.equal(resolveWhisperModelPath(nonExistent), null);
	});

	it("handles empty PCM buffer without error", async () => {
		const addon = getWhisperAddon();
		assert.ok(addon);
		const emptyBuffer = Buffer.alloc(0);
		const result = await addon.transcribePcm16(emptyBuffer);
		assert.equal(result, "");
	});

	it("handles empty f32 sample array without error", async () => {
		const addon = getWhisperAddon();
		assert.ok(addon);
		const result = await addon.transcribeF32([]);
		assert.equal(result, "");
	});

	it("rejects non-empty PCM buffer with informative error when model is missing", async () => {
		const addon = getWhisperAddon();
		assert.ok(addon);
		const nonSilentBuffer = Buffer.alloc(100, 1);
		await assert.rejects(
			async () => {
				await addon.transcribePcm16(nonSilentBuffer, "/non/existent/model.bin");
			},
			{
				message: /Whisper model not found/i,
			},
		);
	});

	it("rejects non-empty f32 samples with informative error when model is missing", async () => {
		const addon = getWhisperAddon();
		assert.ok(addon);
		await assert.rejects(
			async () => {
				await addon.transcribeF32([0.01, 0.02, 0.03], "/non/existent/model.bin");
			},
			{
				message: /Whisper model not found/i,
			},
		);
	});

	it("returns model status from GET /api/stt/status", async () => {
		const { GET } = await import("../app/api/stt/status/route.ts");
		const res = await GET();
		assert.equal(res.status, 200);
		const data = await res.json();
		assert.equal(data.available, true);
		assert.ok(data.defaultModelPath.includes("ggml-small.bin"));
	});

	it("returns 400 from POST /api/stt/transcribe when JSON payload lacks audio", async () => {
		const { POST } = await import("../app/api/stt/transcribe/route.ts");
		const { NextRequest } = await import("next/server");
		const req = new NextRequest("http://localhost:3000/api/stt/transcribe", {
			method: "POST",
			body: JSON.stringify({ wrongField: "data" }),
			headers: { "Content-Type": "application/json" },
		});
		const res = await POST(req);
		if (!checkWhisperModelExists()) {
			assert.equal(res.status, 404);
		} else {
			assert.equal(res.status, 400);
		}
	});

	it("handles POST /api/stt/transcribe when model is not present", async () => {
		const { POST } = await import("../app/api/stt/transcribe/route.ts");
		const { NextRequest } = await import("next/server");
		const req = new NextRequest("http://localhost:3000/api/stt/transcribe", {
			method: "POST",
			body: JSON.stringify({ audio: "AAAA" }),
			headers: { "Content-Type": "application/json" },
		});
		const res = await POST(req);
		if (!checkWhisperModelExists()) {
			assert.equal(res.status, 404);
			const data = await res.json();
			assert.ok(data.error.includes("Modelo Whisper no encontrado"));
		} else {
			assert.equal(res.status, 200);
		}
	});
});


