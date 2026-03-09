#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const argc = argv.length;

const assetList = [];

const worldFile = path.resolve(argv[0]);
const world = JSON.parse(fs.readFileSync(worldFile, {encoding:'utf8'}));

const maps = world.maps.map(mapDef => {
	const mapFile = path.resolve(path.dirname(worldFile), mapDef.fileName);
	const map = JSON.parse(fs.readFileSync(mapFile, {encoding:'utf8'}));

	const {layers, width, height, tilesets, version, ...headers} = map;

	return {...mapDef, ...headers};
});

const fullWorld = {...world, maps, async: true};

const output = {main: fullWorld, assets: {}};

world.maps.forEach(mapDef => {
	const mapFile = path.resolve(path.dirname(worldFile), mapDef.fileName);
	const map = JSON.parse(fs.readFileSync(mapFile, {encoding:'utf8'}));

	output.assets[mapDef.fileName] = map;

	map.tilesets.forEach(tileset => {
		let ts = tileset;
		let rel = mapFile;

		if(tileset.source)
		{
			const tsFile = path.resolve(path.dirname(mapFile), tileset.source);
			ts = JSON.parse(fs.readFileSync(tsFile, {encoding:'utf8'}));
			rel = tsFile;

			output.assets[tileset.source] = ts;
		}

		if(ts.image)
		{
			const imgFile = path.resolve(path.dirname(rel), ts.image);
			const img = fs.readFileSync(imgFile);
			output.assets[ts.image] = img.toString('base64');
		}
	})
});

console.log(JSON.stringify(output, null, 4));
