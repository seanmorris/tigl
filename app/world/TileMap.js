import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';
import { QuickTree } from '../math/QuickTree';
import { Spawner } from '../model/Spawner';
import { SMTree } from '../math/SMTree';
import { Region } from '../sprite/Region';
import { Rectangle } from '../math/Rectangle';
import { Properties } from './Properties';
import { parseColor } from '../sprite/parseColor';

/**
 * @import { Entity } from "../model/Entity";
 * @import { Session } from "../model/Session";
 */

const cache = new Map;

/**
 * Represents an animated tile
 */
class Animation
{
	/**
	 * Construct an Animation
	 * @param {object} param0 - Named params
	 * @param {Array<{duration:number,tileid:number}>} param0.frames - Array of frames
	 * @param {number} param0.x - The x value of the tile to animate
	 * @param {number} param0.y - The y value of the tile to animate
	 */
	constructor({frames, x, y})
	{
		this.x = x;
		this.y = y;

		this.acc = 0;
		this.current = 0;
		this.frames = frames;
	}

	/**
	 * Tick the animation by `delta` ms
	 * @param {number} delta - The number of ms to advance the animation
	 * @returns {number} - The id of the currently displayed frame
	 */
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

/**
 * Represents a map of tiles, objects, & images.
 */
export class TileMap
{
	/**
	 * Construct a TileMap object.
	 * @param {object} mapData - Named params
	 * @param {string} mapData.fileName -The filename/URL of the TileMap
	 * @param {Session} mapData.session -The current Session
	 * @param {number} mapData.x -The x position of the TileMap in the World
	 * @param {number} mapData.y -The y position of the TileMap in the World
	 * @param {number} mapData.width - The width of the TileMap
	 * @param {number} mapData.height - The height of the TileMap
	 */
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

		Bindable.Prevent && (this[Bindable.Prevent] = true);
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
		this.entities = new Map;

		this.animatedTiles = new Map;
		this.animations = new Map;

		this.lastSliceKeys = {};
		this.lastSlices = {};

		// this.ready = this.getReady(fileName);
	}

	/**
	 * Set up the object
	 * @returns {Promise<TileMap>} - Resolves when the TileMap is ready
	 */
	initialize()
	{
		if(this.ready)
		{
			return this.ready;
		}

		return this.ready = this.getReady(this.src);
	}

	/**
	 * Find Entities in a given rectangle
	 * @param {number} wx1 - The x value of the top/left corner
	 * @param {number} wy1 - The y value of the top/left corner
	 * @param {number} wx2 - The x value of the bottom/right corner
	 * @param {number} wy2 - The y value of the bottom/right corner
	 * @returns {Set<Entity>} - The Entities in the rectangle
	 */
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

	/**
	 * Add an Entity to the TileMap
	 * @param {Entity} entity - The Entity to add
	 * @returns {boolean} - Whether the Entity was added
	 */
	addEntity(entity)
	{
		return this.quadTree.add(entity, -this.x, -this.y);
	}

	/**
	 * Move an Entity in the TileMap
	 * @param {Entity} entity - The Entity to move
	 * @returns {boolean} - Whether the move succeeded
	 */
	moveEntity(entity)
	{
		return this.quadTree.move(entity, -this.x, -this.y);
	}

	/**
	 * Get a promise that resolves when the TileMap is ready to use
	 * @param {string|URL} src - The URL of the TileMap to load
	 * @returns {Promise<TileMap>} - Resolves when the TileMap is ready
	 */
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
			layer.data = new Uint32Array(layer.data);
			layer.props = new Properties(layer.properties ?? [], this, layer.type !== 'tilelayer' ? [] : [
				{name: 'priority', type: 'string', value: 'background'}
			]);
			layer.tintcolor = layer.tintcolor
				? parseColor(layer.tintcolor)
				: new Uint8ClampedArray([255, 255, 255, 255]);
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

	/**
	 * Get the TileMap data ready for rendering
	 * @param {Array<Tileset>} tilesets - Tilesets to prepare
	 */
	assemble(tilesets)
	{
		tilesets.sort((a, b) => a.firstGid - b.firstGid);

		const tileTotal = this.tileCount = tilesets.reduce(
			(a, b) => a + b.tileCount, 0
		);

		const size = Math.ceil(Math.sqrt(tileTotal));

		const destination = document.createElement('canvas');
		this.tileSetWidth = destination.width  = size * this.tileWidth;
		this.tileSetHeight = destination.height = Math.ceil(tileTotal / size) * this.tileHeight;

		const ctxDestination = destination.getContext('2d', {willReadFrequently: true});

		for(const tileset of tilesets)
		{
			const image = tileset.image;

			// const source = document.createElement('canvas');
			// source.width = image.width;
			// source.height = image.height;
			const source = new OffscreenCanvas(image.width, image.height);
			const ctxSource = source.getContext('2d', {willReadFrequently: true});

			ctxSource.drawImage(image, 0, 0);

			for(let i = 0; i < tileset.tileCount; i++)
			{
				const gid = i + -1 + tileset.firstGid;

				const xSource = (i * this.tileWidth) % tileset.imageWidth;
				const ySource = Math.floor((i * this.tileWidth) / tileset.imageWidth) * this.tileHeight;

				const xDestination = (gid * this.tileWidth) % destination.width;

				const tile = ctxSource.getImageData(xSource, ySource, this.tileWidth, this.tileHeight);
				const yDestination = Math.floor((gid * this.tileWidth) / destination.width) * this.tileHeight;

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
			const tileValues = new Uint32Array(layer.data.map(Number));
			const tilePixels = new Uint8ClampedArray(tileValues.buffer);

			for(const i in tileValues)
			{
				const rotatedTile = tileValues[i];
				const tile = rotatedTile & 0x0FFFFFFF;
				const flip = tilePixels[i * 4 + 3];

				if(this.animatedTiles.has(tile) && !this.animatedTiles.has(rotatedTile))
				{
					const frames = this.animatedTiles.get(tile).map(f => ({...f}));
					this.animatedTiles.set(rotatedTile, frames);

					console.log(frames);

					if(flip & 0x80)
					{
						frames.forEach(f => {
							f.tileid &= 0x00FFFFFF;
							f.tileid |= (0b1111_1110 << 24)
						});
					}

					if(flip & 0x40)
					{
						frames.forEach(f => {
							f.tileid &= 0x00FFFFFF;
							f.tileid |= (0b1111_1101 << 24)
						});
					}

					if(flip & 0x20000000)
					{
						frames.forEach(f => {
							f.tileid &= 0x00FFFFFF;
							f.tileid |= (0b1111_1011 << 24)
						});
					}

					if(flip & 0x60000000)
					{
						frames.forEach(f => {
							f.tileid &= 0x00FFFFFF;
							f.tileid |= (0b1111_0111 << 24)
						});
					}
				}

				if(this.animatedTiles.has(rotatedTile))
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
					const frames = this.animatedTiles.get(rotatedTile);

					const x = i % this.width;
					const y = Math.floor(i / this.width);

					const animation = new Animation({frames, x, y});

					tree.add(animation);
				}
			}

			for(let i = 3; i < tilePixels.length; i +=4)
			{
				const original = tilePixels[i];

				tilePixels[i] = 0xFF;

				if(original & 0x80)
				{
					tilePixels[i] &= 0b1111_1110;
				}

				if(original & 0x40)
				{
					tilePixels[i] &= 0b1111_1101;
				}

				if(original & 0x20)
				{
					tilePixels[i] &= 0b1111_1011;
				}

				if(original & 0x60)
				{
					tilePixels[i] &= 0b1111_0111;
				}

				if(original) console.log(tilePixels[i], original);
			}

			if(!this.session.hasWebgl2)
			{
				// const canvas = document.createElement('canvas');
				// canvas.width = this.width;
				// canvas.height = this.height;
				const canvas = new OffscreenCanvas(this.width, this.height);
				const context = canvas.getContext('2d', {willReadFrequently: true});

				this.canvases.set(layer, canvas);
				this.contexts.set(layer, context);

				context.putImageData(new ImageData(tilePixels, this.width, this.height), 0, 0);
			}
		}
	}

	/**
	 * Spawn Entities defined in the object-layers
	 */
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

	/**
	 * Tick the simulation once
	 * @param {number} delta - The number of ms since the last tick
	 * @returns {void}
	 */
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

		if(startX !== this.x || startY !== this.y)
		{
			world.motionGraph.moveChildren(
				this
				, this.x - startX
				, this.y - startY
			);

			this.rect.x1 = this.x;
			this.rect.y1 = this.y;
			this.rect.x2 = this.x + this.width * this.tileWidth;
			this.rect.y2 = this.y + this.height * this.tileHeight;

			world.mapTree.move(world.mapRects.get(this));
		}
	}

	/**
	 * Get the collision tile for a point
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @param {number} z - The layer id to check
	 * @returns {boolean|number} - Boolean or tile number
	 */
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

	/**
	 * Get the color of a point
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @param {number} z - The layer id to check
	 * @returns {number|false} - Boolean or uint32 color(number))/no tile (false)
	 */
	getColor(x, y, z = 0)
	{
		return this.getPixel(this.tileLayers[z], x, y, z);
	}

	/**
	 * Check the solidity of a point
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @param {number} z - The layer id to check
	 * @returns {boolean|number} - Boolean or uint32 color indicating solid (true-y)/space (false-y)
	 */
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

	/**
	 * Get the color of a point
	 * @param {*} layer - The Tile Layer to sample
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @returns {number|false} - Boolean or uint32 color(number))/no tile (false)
	 */
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

	/**
	 * Get the tile for a given point
	 * @param {*} layer - The tile layer to check
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @returns {null|number} The tile at the point or null if no tile exists there
	 */
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

	/**
	 * Get a rectangular slice of tile layers at a given priority
	 * @param {string} p - The priority to render
	 * @param {number} x - The x value of the top/left corner of the rectangle to sample
	 * @param {number} y - The y value of the top/left corner of the rectangle to sample
	 * @param {number} w - The width of the rectangle to sample
	 * @param {number} h - The height of the rectangle to sample
	 * @param {number} delta -
	 * @returns {*} - Array of pixel layers
	 */
	getSlice(p, x, y, w, h, delta = 0)
	{
		if(!this.loaded)
		{
			return [];
		}

		const sliceKey = x + ',' + y + ',' + w + ',' + h;

		const pixelLayers = [];

		if(sliceKey !== this.lastSliceKeys[p])
		{
			for(const layer of this.tileLayers)
			{
				if(p !== layer.props.get('priority'))
				{
					continue;
				}

				const context = this.contexts.get(layer);

				const pixels = context.getImageData(
					x // Math.max(x, 0)
					, y // , Math.max(y, 0)
					, w // , w + Math.min(x, 0)
					, h // , h + Math.min(y, 0)
				).data;

				pixelLayers.push(new Uint8Array(pixels.buffer));
			}

			this.lastSliceKeys[p] = sliceKey
			this.lastSlices[p] = pixelLayers;
		}
		else
		{
			pixelLayers.push(...this.lastSlices[p]);
		}

		for(const l in this.tileLayers)
		{
			const layer = this.tileLayers[l];
			const pixels = pixelLayers[l];

			if(p !== layer.props.get('priority'))
			{
				continue;
			}

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
		}

		return pixelLayers;
	}

	/**
	 * Put a rectangular slice of a tile layer into a rendering buffer
	 * @param {*} buffer = The rendering buffer
	 * @param {number} width - The width of the rendering buffer
	 * @param {number} layer - The layer to sample
	 * @param {number} x - The x value of the top/left corner of the rectangle to sample
	 * @param {number} y - The y value of the top/left corner of the rectangle to sample
	 * @param {number} w - The width of the rectangle to sample
	 * @param {number} h - The height of the rectangle to sample
	 */
	getStaticSlice(buffer, width, layer, x, y, w, h)
	{
		// buffer.fill(0);

		const xs = Math.max(0, x);
		const xd = -Math.min(0, x);
		const ys = Math.max(0, y);
		const yd = -Math.min(0, y);

		const wc = Math.max(0, Math.min(w - xd, layer.width - xs));
		const hc = Math.max(0, Math.min(h - yd, layer.height - ys));

		for(let i = 0; i < hc; ++i)
		{
			const os = xs + (i + ys) * layer.width;
			const od = xd + (i + yd) * width;

			buffer.set(layer.data.subarray(os, os + wc), od);
		}
	}

	/**
	 * Get the URL of a tile image given a tile gid
	 * @param {number} gid - The gid of the tile
	 * @returns {URL} - The URL of the tile image
	 */
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

	/**
	 * Get Regions for a given point
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @returns {Set<Region>} - The Regions at the point
	 */
	getRegionsForPoint(x, y)
	{
		const results = new Set;

		if(!this.loaded)
		{
			return results;
		}

		const rects = this.regionTree.query(x, y, x, y);
		rects.forEach(rect => {

			const region = Region.fromRect(rect);

			if(!region.bounds.contains(x, y))
			{
				return;
			}

			results.add(region);
		});

		return results;
	}

	/**
	 * Get Regions for a given rectangle
	 * @param {number} x1 - The x value of the top/left point
	 * @param {number} y1 - The y value of the top/left point
	 * @param {number} x2 - The x value of the bottom/right point
	 * @param {number} y2 - The y value of the bottom/right point
	 * @returns {Set<Region>} - The Regions in the given rectangle
	 */
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
