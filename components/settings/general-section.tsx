"use client";

import { useI18n } from "@/components/i18n-context";
import { type GeneralSettings, type AppLanguage } from "@/src/core";
import { SettingsRow, Toggle } from "./controls.tsx";

export function GeneralSection({
	general,
	onSectionChange,
}: {
	general: GeneralSettings | undefined;
	onSectionChange: (next: GeneralSettings) => void;
}) {
	const { t, language, setLanguage } = useI18n();
	const currentLang: AppLanguage = (general?.language ?? language ?? "es") as AppLanguage;
	const autoUpdate = general?.autoUpdate ?? true;

	const handleLanguageChange = (nextLang: AppLanguage) => {
		setLanguage(nextLang);
		onSectionChange({
			...general,
			language: nextLang,
		});
	};

	const handleAutoUpdateChange = (nextAutoUpdate: boolean) => {
		onSectionChange({
			...general,
			autoUpdate: nextAutoUpdate,
		});
	};

	return (
		<div className="flex flex-col gap-3">
			<SettingsRow
				label={t.settings.language}
				hint={t.settings.languageDesc}
				testid="row-language"
			>
				<div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
					<button
						type="button"
						onClick={() => handleLanguageChange("es")}
						className={`rounded px-2.5 py-1 text-xs font-mono transition-colors ${
							currentLang === "es"
								? "bg-accent font-semibold text-accent-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
						data-testid="lang-option-es"
					>
						{t.settings.spanish}
					</button>
					<button
						type="button"
						onClick={() => handleLanguageChange("en")}
						className={`rounded px-2.5 py-1 text-xs font-mono transition-colors ${
							currentLang === "en"
								? "bg-accent font-semibold text-accent-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
						data-testid="lang-option-en"
					>
						{t.settings.english}
					</button>
				</div>
			</SettingsRow>

			<SettingsRow
				label={t.settings.autoUpdate}
				hint={t.settings.autoUpdateDesc}
				testid="row-auto-update"
			>
				<Toggle
					checked={autoUpdate}
					onChange={handleAutoUpdateChange}
					label="auto-update"
				/>
			</SettingsRow>
		</div>
	);
}
