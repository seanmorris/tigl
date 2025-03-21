import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';
import { Quadtree } from '../math/Quadtree';

import { Player } from '../model/Player';
import { Pushable } from '../model/Pushable';
import { Spawner } from '../model/Spawner';
import { Sprite } from '../sprite/Sprite';

const objectPallet = {
	'@barrel': session => new Pushable({
		sprite: new Sprite({src: './barrel.png', session})
		, session
	}),

	// '@player-start': () => new Player({
	// 	x: 48,
	// 	y: 64,
	// 	world: spriteBoard.world,
	// 	sprite: new Sprite({
	// 		// src: undefined,
	// 		spriteSheet: new SpriteSheet({source: './player.tsj'}),
	// 		spriteBoard: spriteBoard,
	// 		width: 32,
	// 		height: 48,
	// 	}),
	// 	controller: new Controller({keyboard, onScreenJoyPad}),
	// 	camera: Camera,
	// }),
};

export class TileMap
{
	constructor({fileName, session, x, y, width, height})
	{
		this[Bindable.Prevent] = true;
		this.image = document.createElement('img');
		this.src = fileName;
		this.pixels = [];
		this.tileCount = 0;

		this.backgroundColor = null;
		this.session = session;

		this.properties = {};

		this.emptyTiles = new Set;
		this.tilesIndexes = new Map;
		this.canvases = new Map;
		this.contexts = new Map;
		this.tiles = null;

		this.tileLayers   = [];
		this.imageLayers  = [];
		this.objectLayers = [];

		this.xWorld = x;
		this.yWorld = y;

		this.width  = width;
		this.height = height;

		this.tileWidth  = 0;
		this.tileHeight = 0;

		this.tileSetWidth  = 0;
		this.tileSetHeight = 0;

		this.ready = this.getReady(fileName);

		this.animations = new Map;

		this.quadTree = new Quadtree(x, x, x + this.width, y + this.height);
	}

	async getReady(src)
	{
		const mapData = await (await fetch(src)).json();

		this.collisionLayers = mapData.layers.filter(layer => layer.type === 'tilelayer' && layer.class === 'collision');
		this.tileLayers   = mapData.layers.filter(layer => layer.type === 'tilelayer' && layer.class !== 'collision');
		this.imageLayers  = mapData.layers.filter(layer => layer.type === 'imagelayer');
		this.objectLayers = mapData.layers.filter(layer => layer.type === 'objectgroup');

		this.backgroundColor = mapData.backgroundcolor;

		if(mapData.properties)
		for(const property of mapData.properties)
		{
			this.properties[ property.name ] = property.value;
		}

		if(this.properties.backgroundColor)
		{
			this.backgroundColor = this.properties.backgroundColor;
		}

		const tilesets = mapData.tilesets.map(t => new Tileset(t));

		this.width  = mapData.width;
		this.height = mapData.height;

		this.tileWidth  = mapData.tilewidth;
		this.tileHeight = mapData.tileheight;

		await Promise.all(tilesets.map(t => t.ready));

		this.assemble(tilesets);
		this.spawn();

		return this;
	}

	assemble(tilesets)
	{
		tilesets.sort((a, b) => a.firstGid - b.firstGid);

		const tileTotal = this.tileCount = tilesets.reduce((a, b) => a.tileCount + b.tileCount, {tileCount: 0});

		const size = Math.ceil(Math.sqrt(tileTotal));

		const destination = document.createElement('canvas');
		this.tileSetWidth  = destination.width  = size * this.tileWidth;
		this.tileSetHeight = destination.height = Math.ceil(tileTotal / size) * this.tileHeight;

		const ctxDestination = destination.getContext('2d', {willReadFrequently: true});

		for(const tileset of tilesets)
		{
			const image = tileset.image;
			const source = document.createElement('canvas');

			source.width = image.width;
			source.height = image.height;

			const ctxSource = source.getContext('2d', {willReadFrequently: true});

			ctxSource.drawImage(image, 0, 0);

			for(let i = 0; i < tileset.tileCount; i++)
			{
				const xSource = (i * this.tileWidth) % tileset.imageWidth;
				const ySource = Math.floor((i * this.tileWidth) / tileset.imageWidth) * this.tileHeight;

				const xDestination = (i * this.tileWidth) % destination.width;
				const yDestination = Math.floor((i * this.tileWidth) / destination.width) * this.tileHeight;
				const tile = ctxSource.getImageData(xSource, ySource, this.tileWidth, this.tileHeight);

				ctxDestination.putImageData(tile, xDestination, yDestination);

				const pixels = new Uint32Array(tile.data.buffer);

				let empty = true;

				for(const pixel of pixels)
				{
					if(pixel > 0)
					{
						empty = false;
					}
				}

				if(empty)
				{
					this.emptyTiles.add(i);
				}
			}

			for(const tileData of tileset.tiles)
			{
				if(tileData.animation)
				{
					this.animations.set(tileData.id, tileData.animation);
				}
			}
		}

		this.pixels = ctxDestination.getImageData(0, 0, destination.width, destination.height).data;

		this.tiles = ctxDestination;

		for(const layer of [...this.tileLayers, ...this.collisionLayers])
		{
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d', {willReadFrequently: true});

			this.canvases.set(layer, canvas);
			this.contexts.set(layer, context);

			const tileValues = new Uint32Array(layer.data.map(t => 0 + t));
			const tilePixels = new Uint8ClampedArray(tileValues.buffer);

			for(const i in tileValues)
			{
				const tile = tileValues[i];

				if(this.animations.has(tile))
				{
					console.log({i, tile}, this.animations.get(tile));
				}
			}

			for(let i = 3; i < tilePixels.length; i +=4)
			{
				tilePixels[i] = 0xFF;
			}

			this.tilesIndexes.set(layer, tileValues);

			canvas.width = this.width;
			canvas.height = this.height;
			context.putImageData(new ImageData(tilePixels, this.width, this.height), 0, 0);
		}
	}

	spawn()
	{
		for(const layer of this.objectLayers)
		{
			const templates = layer.objects;
			for(const template of templates)
			{
				if(objectPallet[ template.type ])
				{
					const spawner = new Spawner({
						spawnFunction: objectPallet[ template.type ]
						, ...template
						, spriteBoard: this.session.spriteBoard
						, session: this.session
						, world: this.session.world
					});

					spawner.x += this.xWorld;
					spawner.y += this.yWorld;

					this.quadTree.add(spawner);
					this.session.entities.add(spawner);
					this.session.spriteBoard.sprites.add(spawner.sprite);
				}
			}
		}
	}

	getCollisionTile(x, y, z)
	{
		if(!this.collisionLayers || !this.collisionLayers[z])
		{
			return false;
		}

		return this.getTileFromLayer(this.collisionLayers[z], x, y);
	}

	getColor(x, y, z = 0)
	{
		return this.getPixel(this.tileLayers[z], x, y, z);
	}

	getSolid(x, y, z = 0)
	{
		if(!this.collisionLayers || !this.collisionLayers[z])
		{
			return false;
		}

		const pixel = this.getPixel(this.collisionLayers[z], x, y, z);

		if(pixel === 0)
		{
			return true;
		}

		return pixel;
	}

	getPixel(layer, x, y)
	{
		const tileNumber = this.getTileFromLayer(layer, x, y);

		if(tileNumber === false || tileNumber === -1)
		{
			return false;
		}

		const offsetX = Math.trunc(x % this.tileWidth);
		const offsetY = Math.trunc(y % this.tileHeight);

		const tileSetX = (tileNumber * this.tileWidth) % this.tileSetWidth;
		const tileSetY = Math.floor((tileNumber * this.tileWidth) / this.tileSetWidth);

		return this.pixels[tileSetX + offsetX + (tileSetY + offsetY) * (this.tileSetWidth)];
	}

	getTileFromLayer(layer, x, y)
	{
		const localX = -this.xWorld + x;
		const localY = -this.yWorld + y;

		if(localX < 0 || localX >= this.width * this.tileWidth
			|| localY < 0 || localY >= this.height * this.tileWidth
		){
			return false;
		}

		const tileX = Math.floor(localX / this.tileWidth);
		const tileY = Math.floor(localY / this.tileHeight);

		return -1 + layer.data[tileX + tileY * this.width];
	}

	getSlice(x, y, w, h, t = 0)
	{
		return (this.tileLayers
			.map(layer => this.contexts.get(layer))
			.map(context => context.getImageData(x, y, w, h).data));

		return this.contexts.values().map(context => context.getImageData(x, y, w, h).data);
	}
}
