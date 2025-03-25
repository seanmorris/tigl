#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const argc = argv.length;

const worldFile = path.resolve(argv[0]);
const world = JSON.parse(fs.readFileSync(worldFile, {encoding:'utf8'}));

const maps = world.maps.map(mapDef => {
	const mapFile = path.resolve(path.dirname(worldFile), mapDef.fileName);
	const map = JSON.parse(fs.readFileSync(mapFile, {encoding:'utf8'}));

	const {layers, width, height, tilesets, version, ...headers} = map;

	return {...mapDef, ...headers};
});

const output = {...world, maps, async: true};

console.log(JSON.stringify(output, null, 4));