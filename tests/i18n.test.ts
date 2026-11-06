import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { I18N_ES, I18N_EN, getI18n } from "../src/core/index.ts";

describe("I18N bilingual support (Spanish & English)", () => {
	it("exports structured I18N_ES and I18N_EN dictionaries from src/core", () => {
		assert.ok(I18N_ES);
		assert.ok(I18N_EN);
		assert.equal(typeof I18N_ES, "object");
		assert.equal(typeof I18N_EN, "object");
	});

	it("guarantees 1:1 key parity between I18N_ES and I18N_EN", () => {
		const esSections = Object.keys(I18N_ES).sort();
		const enSections = Object.keys(I18N_EN).sort();
		assert.deepEqual(esSections, enSections, "Sections mismatch between ES and EN");

		for (const section of esSections) {
			const esKeys = Object.keys((I18N_ES as unknown as Record<string, Record<string, string>>)[section]!).sort();
			const enKeys = Object.keys((I18N_EN as unknown as Record<string, Record<string, string>>)[section]!).sort();
			assert.deepEqual(
				esKeys,
				enKeys,
				`Keys mismatch in section '${section}' between ES and EN`,
			);
		}
	});

	it("returns correct dictionary via getI18n helper", () => {
		assert.equal(getI18n("es"), I18N_ES);
		assert.equal(getI18n("en"), I18N_EN);
		assert.equal(getI18n(null), I18N_ES, "Fallback to ES on null");
		assert.equal(getI18n(undefined), I18N_ES, "Fallback to ES on undefined");
	});

	it("verifies English translations for primary UI elements", () => {
		assert.equal(I18N_EN.sidebar.teach, "Teach");
		assert.equal(I18N_EN.sidebar.practice, "Practice");
		assert.equal(I18N_EN.sidebar.settings, "Settings");
		assert.equal(I18N_EN.settings.title, "Settings");
		assert.equal(I18N_EN.settings.language, "Language");
		assert.equal(I18N_EN.composer.send, "Send");
		assert.equal(I18N_EN.composer.stop, "Stop");
		assert.equal(I18N_EN.dictation.dictate, "Dictate");
		assert.equal(I18N_EN.home.startLearning, "Start");
	});

	it("verifies Spanish translations for primary UI elements", () => {
		assert.equal(I18N_ES.sidebar.teach, "Enseñar");
		assert.equal(I18N_ES.sidebar.practice, "Práctica");
		assert.equal(I18N_ES.sidebar.settings, "Configuración");
		assert.equal(I18N_ES.settings.title, "Configuración");
		assert.equal(I18N_ES.settings.language, "Idioma");
		assert.equal(I18N_ES.composer.send, "Enviar");
		assert.equal(I18N_ES.composer.stop, "Detener");
		assert.equal(I18N_ES.dictation.dictate, "Dictar");
		assert.equal(I18N_ES.home.startLearning, "Comenzar");
	});
});
