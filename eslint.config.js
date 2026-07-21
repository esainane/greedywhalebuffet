import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	globalIgnores([
		".parcel-cache/**",
		"dist/**",
	]),

	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],

		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
		],

		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: globals.browser,
		},

		rules: {},
	},
]);
