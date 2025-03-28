import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';
import { QuickTree } from '../math/QuickTree';
import { Spawner } from '../model/Spawner';
import { SMTree } from '../math/SMTree';
import { Region } from '../sprite/Region';
import { Rectangle } from '../math/Rectangle';
import { Properties } from './Properties';

const cache = new Map;

class Animation
{
	constructor({frames, x, y})
	{
		this.x = x;
		this.y = y;

		this.acc = 0;
		this.current = 0;
		this.frames = frames;
	}

	animate(delta)
	{
		this.acc += delta;

		while(this.acc > this.frames[this.current].duration)
		{
			this.acc -= this.frames[this.current].duration;
			this.current++;

			if(this.current > -1 + this.frames.length)
			{
				this.current = 0;
			}
		}

		return 1 + this.frames[this.current].tileid;
	}
}

export class TileMap
{
	constructor(mapData)
	{
		const {
			fileName
			, session
			, x
			, y
			, width
			, height
		} = mapData;

		this[Bindable.Prevent] = true;
		this.src = fileName;
		this.backgroundColor = null;
		this.tileCount = 0;

		this.x = x;
		this.y = y;

		this.loaded = false;

		this.worldWidth = width;
		this.worldHeight = height;

		this.rect = new Rectangle(
			this.x
			, this.y
			, this.x + this.worldWidth
			, this.y + this.worldHeight
		);

		this.tileWidth  = 0;
		this.tileHeight = 0;

		this.tileSetWidth  = 0;
		this.tileSetHeight = 0;

		this.props = new Properties(mapData.properties ?? [], this);

		this.pixels = null;
		this.values = null;
		this.image = document.createElement('img');
		this.session = session;
		this.entityDefs = {};

		this.emptyTiles = new Set;
		this.tilesIndexes = new Map;
		this.canvases = new Map;
		this.contexts = new Map;
		this.tiles = null;

		this.xOrigin = x;
		this.yOrigin = y;

		this.tileLayers   = [];
		this.imageLayers  = [];
		this.objectLayers = [];

		this.visible = false;

		this.age = 0;

		this.quadTree = new QuickTree(-64, -64, this.worldWidth + 64, this.worldHeight + 64);
		this.regionTree = new SMTree;
		this.animationTrees = new Map;
		this.entityMap = new Map;

		this.animatedTiles = new Map;
		this.animations = new Map;

		// this.ready = this.getReady(fileName);
	}

	initialize()
	{
		if(this.ready)
		{
			return this.ready;
		}

		return this.ready = this.getReady(this.src);
	}

	selectEntities(wx1, wy1, wx2, wy2)
	{
		return this.quadTree.select(
			wx1 - this.x
			, wy1 - this.y
			, wx2 - this.x
			, wy2 - this.y
			, -this.x
			, -this.y
		);
	}

	addEntity(entity)
	{
		return this.quadTree.add(entity, -this.x, -this.y);
	}

	moveEntity(entity)
	{
		return this.quadTree.move(entity, -this.x, -this.y);
	}

	async getReady(src)
	{
		if(!cache.has(src))
		{
			cache.set(src, fetch(src));
		}

		// await new Promise(a => setTimeout(a, 500));

		const mapData = await (await cache.get(src)).clone().json();

		this.props.add(...mapData.properties ?? []);

		mapData.layers.forEach(layer => {
			layer.props = new Properties(layer.properties ?? [], this);
		})

		this.collisionLayers = mapData.layers.filter(layer => layer.type === 'tilelayer' && layer.class === 'collision');
		this.tileLayers   = mapData.layers.filter(layer => layer.type === 'tilelayer' && layer.class !== 'collision');
		this.imageLayers  = mapData.layers.filter(layer => layer.type === 'imagelayer');
		this.objectLayers = mapData.layers.filter(layer => layer.type === 'objectgroup');
		this.backgroundColor = mapData.backgroundcolor;

		if(this.props.has('backgroundColor'))
		{
			this.backgroundColor = this.props.get('backgroundColor');
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

		this.loaded = true;

		if(mapData.class)
		{
			this.controller = new (await this.session.mapPallet.resolve(mapData.class));
			this.controller.create(this);
		}

		return this;
	}

	assemble(tilesets)
	{
		tilesets.sort((a, b) => a.firstGid - b.firstGid);

		const tileTotal = this.tileCount = tilesets.reduce(
			(a, b) => a + b.tileCount, 0
		);

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
				const gid = i + -1 + tileset.firstGid;

				const xSource = (i * this.tileWidth) % tileset.imageWidth;
				const ySource = Math.floor((i * this.tileWidth) / tileset.imageWidth) * this.tileHeight;

				const xDestination = (gid * this.tileWidth) % destination.width;
				const yDestination = Math.floor((gid * this.tileWidth) / destination.width) * this.tileHeight;
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
					this.emptyTiles.add(gid);
				}
			}

			for(const tileData of tileset.tiles)
			{
				if(tileData.animation)
				{
					this.animatedTiles.set(tileData.id, tileData.animation);
				}
			}
		}

		this.pixels = ctxDestination.getImageData(0, 0, destination.width, destination.height).data;
		this.values = new Uint32Array(this.pixels.buffer);
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

				if(this.animatedTiles.has(tile))
				{
					if(!this.animationTrees.has(layer))
					{
						this.animationTrees.set(layer, new QuickTree(
							0, 0
							, this.width
							, this.height
							, 0.1
						));
					}

					const tree = this.animationTrees.get(layer);
					const frames = this.animatedTiles.get(tile);

					const x = i % this.width;
					const y = Math.floor(i / this.width);

					const animation = new Animation({frames, x, y});

					tree.add(animation);
				}
			}

			for(let i = 3; i < tilePixels.length; i +=4)
			{
				tilePixels[i] = 0xFF - tilePixels[i];
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

				entityDef.x += this.xOrigin;
				entityDef.y += this.yOrigin;

				if(!entityDef.type || entityDef.name === '#player-start')
				{
					continue;
				}

				if(entityDef.name === '#region')
				{
					const region = new Region({
						spriteBoard: this.session.spriteBoard
						, session: this.session
						, ...entityDef
					});

					this.session.world.motionGraph.add(region, this);
					this.session.spriteBoard.regions.add(region);
					this.regionTree.add(region.rect);
					continue;
				}

				const spawnClass = await this.session.entityPallet.resolve(entityDef.type);

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

				this.session.world.motionGraph.add(spawner, this);
				spawner.lastMap = this;
				this.session.addEntity(spawner);
				this.addEntity(spawner)
			}
		}
	}

	simulate(delta)
	{
		if(!this.loaded)
		{
			return;
		}

		const startX = this.x;
		const startY = this.y;
		const world = this.session.world;

		this.age += delta;
		this.controller && this.controller.simulate(this, delta);

		world.motionGraph.moveChildren(
			this
			, this.x - startX
			, this.y - startY
		);

		this.rect.x1 = this.x;
		this.rect.y1 = this.y;
		this.rect.x2 = this.x + this.width * this.tileWidth;
		this.rect.y2 = this.y + this.height * this.tileHeight;

		if(startX !== this.x || startY !== this.y)
		{
			world.mapTree.move(world.mapRects.get(this));
		}
	}

	getCollisionTile(x, y, z)
	{
		if(!this.loaded)
		{
			return true;
		}

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
		if(!this.loaded)
		{
			return true;
		}

		if(!this.collisionLayers || !this.collisionLayers[z])
		{
			return false;
		}

		const pixel = this.getPixel(this.collisionLayers[z], x, y, z);

		return pixel;
	}

	getPixel(layer, x, y)
	{
		if(!this.loaded)
		{
			return false;
		}

		const gid = this.getTileFromLayer(layer, x, y);

		if(gid === false || gid === -1)
		{
			return false;
		}

		const offsetX = Math.trunc((-this.x + x) % this.tileWidth);
		const offsetY = Math.trunc((-this.y + y) % this.tileHeight);

		const tileSetX = (gid * this.tileWidth) % this.tileSetWidth;
		const tileSetY = Math.floor((gid * this.tileWidth) / this.tileSetWidth) * this.tileHeight;

		const pixel = this.values[tileSetX + offsetX + (tileSetY + offsetY) * (this.tileSetWidth)];

		return pixel;
	}

	getTileFromLayer(layer, x, y)
	{
		if(!this.loaded)
		{
			return false;
		}

		const localX = -this.x + x;
		const localY = -this.y + y;

		if(localX < 0 || localX >= this.width * this.tileWidth
			|| localY < 0 || localY >= this.height * this.tileWidth
		){
			return false;
		}

		const tileX = Math.floor(localX / this.tileWidth);
		const tileY = Math.floor(localY / this.tileHeight);

		return -1 + layer.data[tileX + tileY * this.width];
	}

	getSlice(p, x, y, w, h, delta = 0)
	{
		if(!this.loaded)
		{
			return [];
		}

		return this.tileLayers
			.filter(layer => p === (layer.props.get('priority') ?? 'background'))
			.map(layer => {
				const context = this.contexts.get(layer);
				const pixels = context.getImageData(x, y, w, h).data;
				const tree = this.animationTrees.get(layer);
				if(tree)
				{
					const values = new Uint32Array(pixels.buffer);
					const animations = tree.select(x, y, x + w, y + h);
					for(const animation of animations)
					{
						const xLocal = animation.x - x;
						const yLocal = animation.y - y;

						if(xLocal < w)
						{
							const iLocal = xLocal + yLocal * w;
							values[iLocal] = animation.animate(delta);
						}
					}
				}
				return pixels;
			}
		);
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

	getRegionsForPoint(x, y)
	{
		const results = new Set;

		if(!this.loaded)
		{
			return results;
		}

		const rects = this.regionTree.query(x, y, x, y);
		rects.forEach(r => {
			if(!r.contains(x, y))
			{
				return;
			}

			results.add(Region.fromRect(r));
		});

		return results;
	}

	getRegionsForRect(x1, y1, x2, y2)
	{
		const results = new Set;

		if(!this.loaded)
		{
			return results;
		}

		const searchRect = new Rectangle(x1, y1, x2, y2)
		const rects = this.regionTree.query(x1, y1, x2, y2);
		rects.forEach(r => {
			if(!searchRect.isOverlapping(r))
			{
				return;
			}

			results.add(Region.fromRect(r));
		});

		return results;
	}
}
