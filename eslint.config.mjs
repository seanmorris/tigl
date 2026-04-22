import globals from "globals"
import { jsdoc } from 'eslint-plugin-jsdoc';

export default [
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
		rules: {
			"jsdoc/no-undefined-types": ["warn", {
				"definedTypes": [
				]
			}],
			"jsdoc/require-jsdoc": ["warn",{
				contexts: [
					"PropertyDefinition",
					"ClassProperty",
					"FunctionDeclaration",
					"MethodDefinition",
					"ClassDeclaration",
				]
			}]
		}
	},
	jsdoc({ config: 'flat/recommended' }),
	{
		ignores: ['docs/**', 'scripts/**', 'app/inject/**', 'app/model/**', '.brunch/**'],
	}
];

// eslint.configs.recommended,
// ...tseslint.configs.recommended,
// {
// files: ['**/*.ts'],
// rules: { 'no-unused-vars': 'warn' }
// }
