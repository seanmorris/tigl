import { Bindable } from 'curvature/base/Bindable';
import { EntityPallet } from './EntityPallet';
import { Tileset } from '../sprite/Tileset';
import { QuickTree } from '../math/QuickTree';
import { Spawner } from '../model/Spawner';

export class TileMap
{
	constructor({fileName, session, x, y, width, height})
	{
		this[Bindable.Prevent] = true;
		this.src = fileName;
		this.backgroundColor = null;
		this.tileCount = 0;

		this.xWorld = x;
		this.yWorld = y;

		this.width  = width;
		this.height = height;

		this.tileWidth  = 0;
		this.tileHeight = 0;

		this.tileSetWidth  = 0;
		this.tileSetHeight = 0;

		this.pixels = [];
		this.image = document.createElement('img');
		this.session = session;

		this.properties = {};
		this.entityDefs = {};

		this.emptyTiles = new Set;
		this.tilesIndexes = new Map;
		this.canvases = new Map;
		this.contexts = new Map;
		this.tiles = null;

		this.tileLayers   = [];
		this.imageLayers  = [];
		this.objectLayers = [];

		this.ready = this.getReady(fileName);

		this.animations = new Map;
		this.visible = false;

		this.quadTree = new QuickTree(x, y, x + this.width, y + this.height);
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

		const tilesets = mapData.tilesets.map(tilesetData => {
			if(tilesetData.source)
			{
				tilesetData.source = new URL(tilesetData.source, src).href;
			}
			else
			{
				tilesetData.map = this;
			}
			return new Tileset(tilesetData);
		});

		this.width  = mapData.width;
		this.height = mapData.height;

		this.tileWidth  = mapData.tilewidth;
		this.tileHeight = mapData.tileheight;

		await Promise.all(tilesets.map(t => t.ready));

		this.assemble(tilesets);
		await this.spawn();

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

	async spawn()
	{
		for(const layer of this.objectLayers)
		{
			const entityDefs = layer.objects;

			for(const entityDef of entityDefs)
			{
				this.entityDefs[ entityDef.id ] = {...entityDef};

				entityDef.x += this.xWorld;
				entityDef.y += this.yWorld;

				if(!entityDef.type || entityDef.name === 'player-start')
				{
					continue;
				}

				const spawnClass = await EntityPallet.resolve(entityDef.type);

				if(!spawnClass)
				{
					console.warn(`SpawnClass not found: ${entityDef.type}`);
					continue;
				}

				const spawner = new Spawner({
					spawnType: entityDef.type
					, spawnClass
					, entityDef
					, ...entityDef
					, spriteBoard: this.session.spriteBoard
					, session: this.session
					, world: this.session.world
					, map: this
				});

				this.session.addEntity(spawner);
				this.quadTree.add(spawner)
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
		const gid = this.getTileFromLayer(layer, x, y);

		if(gid === false || gid === -1)
		{
			return false;
		}

		const offsetX = Math.trunc(x % this.tileWidth);
		const offsetY = Math.trunc(y % this.tileHeight);

		const tileSetX = (gid * this.tileWidth) % this.tileSetWidth;
		const tileSetY = Math.floor((gid * this.tileWidth) / this.tileSetWidth);

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

	getTileImage(gid)
	{
		gid = -1 + gid;
		const tileSetX = (gid * this.tileWidth) % this.tileSetWidth;
		const tileSetY = Math.floor((gid * this.tileWidth) / this.tileSetWidth) * this.tileHeight;

		const imageData = this.tiles.getImageData(tileSetX, tileSetY, this.tileWidth, this.tileHeight);

		const c = document.createElement('canvas');
		const cc = c.getContext('2d');

		c.width = this.tileWidth;
		c.height = this.tileHeight;

		cc.putImageData(imageData, 0, 0);

		return c.toDataURL();
	}
}
