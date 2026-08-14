import Schema from "@deepseek-ai/schemastery";

//#region src/config.ts
const DEFAULT_CONFIG = Object.freeze({
	remember: true,
	hashSelector: true,
	settingsOrder: 40
});

//#endregion
//#region src/index.ts
const name = "theme-zhongguo";
const Config = Schema.object({
	defaultTheme: Schema.string(),
	remember: Schema.boolean().default(DEFAULT_CONFIG.remember),
	hashSelector: Schema.boolean().default(DEFAULT_CONFIG.hashSelector),
	settingsOrder: Schema.number().default(DEFAULT_CONFIG.settingsOrder)
});
/** Provides no host-side behavior — the roster and the picker are browser-side. */
function apply() {}

//#endregion
export { Config, apply, name };