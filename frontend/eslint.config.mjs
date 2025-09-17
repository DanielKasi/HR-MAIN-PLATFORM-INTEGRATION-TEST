import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import react from "eslint-plugin-react";
import unusedImports from "eslint-plugin-unused-imports";
import _import from "eslint-plugin-import";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default defineConfig([
	globalIgnores([
		".next/*",
		"**/*.css",
		"**/dist",
		"esm/*",
		"public/*",
		"tests/*",
		"scripts/*",
		"**/*.config.js",
		"**/node_modules",
		"**/coverage",
		"**/.next",
		"**/build",
		"**/out/",
	]),
	{
		extends: fixupConfigRules(
			compat.extends(
				"plugin:react/recommended",
				"plugin:prettier/recommended",
				"plugin:react-hooks/recommended",
				"plugin:jsx-a11y/recommended",
				"eslint:recommended",
				"plugin:prettier/recommended",
			),
		),

		plugins: {
			react: fixupPluginRules(react),
			"unused-imports": unusedImports,
			import: fixupPluginRules(_import),
			"@typescript-eslint": typescriptEslint,
			"jsx-a11y": fixupPluginRules(jsxA11Y),
			prettier: fixupPluginRules(prettier),
		},

		languageOptions: {
			globals: {
				...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "readonly"])),
				...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, "readonly"])),
				React: "readonly",
				NodeJS: "readonly",
			},

			parser: tsParser,
			ecmaVersion: 12,
			sourceType: "module",

			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},

		settings: {
			react: {
				version: "detect",
			},
		},

		rules: {
			"no-console": "off",
			"react/prop-types": "off",
			"react/no-unescaped-entities": "off",
			"jsx-a11y/label-has-associated-control": "off",
			"react/jsx-uses-react": "off",
			"react/react-in-jsx-scope": "off",
			"react-hooks/exhaustive-deps": "off",
			"jsx-a11y/click-events-have-key-events": "off",
			"jsx-a11y/interactive-supports-focus": "warn",
			"prettier/prettier": "off",
			"no-unused-vars": "off",
			"unused-imports/no-unused-vars": "off",
			"unused-imports/no-unused-imports": "warn",
			"object-curly-spacing": "off",

			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					args: "after-used",
					ignoreRestSiblings: false,
					argsIgnorePattern: "^_.*?$",
				},
			],

			"import/order": [
				"warn",
				{
					groups: [
						"type",
						"builtin",
						"object",
						"external",
						"internal",
						"parent",
						"sibling",
						"index",
					],

					pathGroups: [
						{
							pattern: "~/**",
							group: "external",
							position: "after",
						},
					],

					"newlines-between": "always",
				},
			],

			"react/self-closing-comp": "warn",

			"react/jsx-sort-props": [
				"off",
				{
					callbacksLast: true,
					shorthandFirst: true,
					noSortAlphabetically: false,
					reservedFirst: true,
				},
			],

			"padding-line-between-statements": [
				"warn",
				{
					blankLine: "always",
					prev: "*",
					next: "return",
				},
				{
					blankLine: "always",
					prev: ["const", "let", "var"],
					next: "*",
				},
				{
					blankLine: "any",
					prev: ["const", "let", "var"],
					next: ["const", "let", "var"],
				},
			],
			"jsx-a11y/no-autofocus": "off",
			"no-redeclare": "off",
			"@typescript-eslint/no-redeclare": ["error"],
			"no-empty": "off",
			"jsx-a11y/heading-has-content": "warn",
			"jsx-a11y/no-static-element-interactions": "off",
			"jsx-a11y/anchor-has-content": "off",
			"react/no-unknown-property": "warn",
			"jsx-a11y/aria-role": "off",
			"no-useless-catch": "off",
			"jsx-a11y/anchor-is-valid": "warn",
			"no-case-declarations": "off",
		},
	},
]);
