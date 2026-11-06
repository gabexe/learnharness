"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type AppLanguage, type I18nDictionary, getI18n } from "@/src/core";
import { useSettingsSaved } from "@/components/settings-signal";

interface I18nContextValue {
	language: AppLanguage;
	t: I18nDictionary;
	setLanguage: (lang: AppLanguage) => void;
}

const defaultDictionary = getI18n("en");

const I18nContext = createContext<I18nContextValue>({
	language: "en",
	t: defaultDictionary,
	setLanguage: () => {},
});

export function I18nProvider({
	initialLanguage = "es",
	children,
}: {
	initialLanguage?: AppLanguage;
	children: ReactNode;
}) {
	const [language, setLanguageState] = useState<AppLanguage>(initialLanguage);

	useEffect(() => {
		let active = true;
		fetch("/api/settings")
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (active && data?.general?.language) {
					setLanguageState(data.general.language);
				}
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);

	useSettingsSaved((section) => {
		if (section === "general") {
			fetch("/api/settings")
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (data?.general?.language) {
						setLanguageState(data.general.language);
					}
				})
				.catch(() => {});
		}
	});

	const setLanguage = (lang: AppLanguage) => {
		setLanguageState(lang);
	};

	const t = getI18n(language);

	return (
		<I18nContext.Provider value={{ language, t, setLanguage }}>
			{children}
		</I18nContext.Provider>
	);
}

export function useI18n(): I18nContextValue {
	return useContext(I18nContext);
}
