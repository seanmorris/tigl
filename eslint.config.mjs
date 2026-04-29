import globals from "globals";
import { jsdoc } from 'eslint-plugin-jsdoc';
import smNoSaccadeStyle from 'sm-no-saccade-style';

export default [
	...smNoSaccadeStyle.configs.recommended
	, {
		languageOptions: {
			globals: {
				...globals.browser,
			}
		}
		, rules: {
			"jsdoc/no-undefined-types": ["warn", {
				"definedTypes": [
				]
			}]
			, "jsdoc/require-jsdoc": ["warn",{
				contexts: [
					"PropertyDefinition"
					, "ClassProperty"
					, "FunctionDeclaration"
					, "MethodDefinition"
					, "ClassDeclaration"
				]
			}]
		}
	}
	, jsdoc({ config: 'flat/recommended' })
	, {
		ignores: ['docs/**', 'scripts/**', 'app/inject/**', '.brunch/**']
	}
];

// eslint.configs.recommended,
// ...tseslint.configs.recommended,
// {
// files: ['**/*.ts'],
// rules: { 'no-unused-vars': 'warn' }
// }
