import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';

const dir = path.dirname(fileURLToPath(import.meta.url));

console.log(dir);

const config = {
	resolve: {
		alias: {
			'/Config': path.resolve(dir, 'app/Config.js'),
			'Routes': path.resolve(dir, 'app/Routes.js'),
		}
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: { loader: "babel-loader" }
			},
			{
				test: /\.(tmp\.html|frag|vert)$/,
				type: 'asset/source',
			},
		]
	},
	entry: { index: './app/initialize.js' },
	output: {
		path: path.resolve('./docs'),
		filename: 'index.js',
	},
	target: 'web',
	plugins: [
		new webpack.ContextReplacementPlugin(
			/curvature\/base/,
			path.resolve(dir, 'node_modules/curvature/base'),
			{
				'Routes': path.resolve(dir, 'app/Routes.js'),
				'/Config': path.resolve(dir, 'app/Config.js'),
				'curvature/base/Tag': path.resolve(dir, 'node_modules/curvature/base/Tag.js'),
			}
		),
	],
};

export default config;
