module.exports = {
	watcher: { awaitWriteFinish: true }
	, paths: { public: './docs' }
	, modules: {}
	, files: {
		stylesheets: { joinTo: 'app.css' }
		, javascripts: { joinTo: 'app.js' }
	}
	, plugins: {
		preval: { tokens: { BUILD_TIME: () => Date.now() } }
		, raw: {
			pattern: /\.(html|svg|frag|vert)$/,
			wrapper: content => `module.exports = ${JSON.stringify(content)}`
		}
		, babel: {
			plugins: ["macros"],
			targets: { browsers: ['>0.25%'] },
			presets: [[
				'@babel/preset-env', {
					useBuiltIns: false,
					// modules: false,
					exclude: [
						'@babel/plugin-transform-async-to-generator',
						'@babel/plugin-transform-template-literals',
						'@babel/plugin-transform-arrow-functions',
						'@babel/plugin-transform-dynamic-import',
						'@babel/plugin-transform-typeof-symbol',
						'@babel/plugin-transform-block-scoping',
						'@babel/plugin-transform-regenerator',
						'@babel/plugin-transform-for-of',
						'@babel/plugin-transform-spread',
					]
				}
			]]
		}
	}
};
