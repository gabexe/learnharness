import { I18N_ES } from "./es.ts";
import { I18N_EN } from "./en.ts";
import type { AppLanguage, I18nDictionary } from "./types.ts";

export * from "./types.ts";
export * from "./es.ts";
export * from "./en.ts";

/**
 * Returns the dictionary for the specified language ("es" or "en").
 * Falls back to Spanish ("es") if an unsupported language is provided.
 */
export function getI18n(lang?: AppLanguage | string | null): I18nDictionary {
	if (lang === "en") {
		return I18N_EN;
	}
	return I18N_ES;
}
