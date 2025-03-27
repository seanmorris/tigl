'use strict';

const Path = require('node:path');
const fs = require('node:fs');

let logger;
try { logger = require('loggy') } catch (error) {};

class TiledPreprocessor
{
	constructor(config)
	{
		this.rootConfig = config || {};
		this.config = config.plugins.tiledpreprocessor || {};

		this.config.include = this.config.include || false;
		this.config.exclude = this.config.exclude || /app\/assets\/.*\.compiled\.world$/;
	}

	compileStatic(file)
	{
		let {data, path} = file;

		// Skip excluded paths
		if(this.config.exclude && path.match(this.config.exclude))
		{
			if(this.config.include && !path.match(this.config.include))
			{
				return null;
			}

			if(!this.config.include)
			{
				return null;
			}
		}

		const watchedDir = this.rootConfig._normalized.paths.watched[0];
		const publicDir  = this.rootConfig._normalized.paths.public;

		const outputPath = String(path)
		.replace(watchedDir + '/assets', publicDir)
		.replace(/world$/, 'compiled.world');

		try
		{
			if(fs.existsSync(outputPath))
			{
				const statSparsed = fs.statSync(outputPath);
				const statOriginal = fs.statSync(path);
				const ageDiffMs = statSparsed.mtimeMs - statOriginal.mtimeMs;
				const ageDiffSec = Number(ageDiffMs / 1000).toFixed(2);

				if(statSparsed.mtimeMs > statOriginal.mtimeMs)
				{
					const existing = fs.readFileSync(outputPath, {encoding:'utf8', flag:'r'});

					logger.info(`Built file is ${ageDiffSec} seconds newer than artifact, skipping: ${path}`);

					return Promise.resolve({path, data: existing});
				}

				logger.info(`Source file is ${-ageDiffSec} seconds newer than artifact, building: ${path}`);
			}
			else
			{
				logger.info(`Source file is not yet processed, sparsing: ${path}`);
			}

		}
		catch (error)
		{
			logger.error(error);
		}

		logger.info('Building to: ' + outputPath);

		const worldFile = Path.resolve(path);
		const world = JSON.parse(fs.readFileSync(worldFile, {encoding:'utf8'}));

		const maps = world.maps.map(mapDef => {
			const mapFile = Path.resolve(Path.dirname(worldFile), mapDef.fileName);
			const map = JSON.parse(fs.readFileSync(mapFile, {encoding:'utf8'}));

			const {layers, width, height, tilesets, version, ...headers} = map;

			return {...mapDef, ...headers};
		});

		const output = {...world, maps, async: true};

		return Promise.resolve({data:JSON.stringify(output), outputPath});
	}
}

const brunchPlugin = true;
const pattern = /app\/assets\/.*\.world$/;
const type = 'template';

const staticTargetExtension = '.compiled.world';
const extension = 'world';

Object.assign(TiledPreprocessor.prototype, {
	brunchPlugin
	, pattern
	, type
	, staticTargetExtension
	, extension
});

module.exports = TiledPreprocessor;
