import { merge } from 'webpack-merge';
import common from './webpack.common.mjs';

/** @type {Partial<any>} */
const devConfig = {
	mode: 'development',
	devtool: 'source-map',
	devServer: {
		static: './docs',
		hot: true,
		port: 3000,
	},
};

export default merge(common, devConfig);
