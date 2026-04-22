/**
 * @import { TileMap } from "../world/TileMap"
 */

/**
 * @type {Map<string,Promise<Response>>}
 */
const cacheMain = new Map;

/**
 * @type {Map<string,Promise<HTMLImageElement>>}
 */
const cacheImages = new Map;

/**
 * @typedef {{
 *   duration: number,
 *   tileid: number,
 * }} TileAnimation
 * @typedef {{
 *   id: number,
 *   type: string,
 *   animation: TileAnimation[]
 * }} Tile
 */

/**
 * Represents a Tileset
 * Can load async or consume already loaded data
 */
export class Tileset
{
	/**
	 * Construct a Tileset object
	 * @param {object} param0 - Named params
	 * @param {string|URL} [param0.src] - The URL of the Tileset to load
	 * @param {string|URL} [param0.source] - Alias of `src` for compatibility
	 * @param {TileMap|undefined} [param0.map] - The TileMap this Tileset belongs to
	 * @param {number} [param0.firstgid] - The first GID in this Tileset
	 * @param {number} [param0.columns] - The number of columns in the Tileset
	 * @param {string|URL} [param0.image] - The URL to the Tileset image
	 * @param {number} [param0.imageheight] - The width of the Tileset image
	 * @param {number} [param0.imagewidth] - The width of the Tileset image
	 * @param {number} [param0.margin] - The around each tile
	 * @param {string} [param0.name] - The name of the Tileset
	 * @param {number} [param0.spacing] - The spacing between each tile
	 * @param {number} [param0.tilecount] - The number of tiles
	 * @param {number} [param0.tilewidth] - The width of one tile
	 * @param {number} [param0.tileheight] - The height of one tile
	 * @param {Array<Tile>} [param0.tiles] - The tile GIDs
	 */
	constructor({
		source, src, map, firstgid, columns, image, imageheight, imagewidth
		, margin , name, spacing, tilecount, tilewidth, tileheight, tiles
	}){
		this.firstGid = firstgid ?? 0;
		this.tileCount  = tilecount ?? 0;
		this.tileHeight = tileheight ?? 0;
		this.tileWidth  = tilewidth ?? 0;

		src = src ?? source;

		if(src)
		{
			this.src = new URL(src, globalThis.location.href);
		}

		this.map = map;

		/** @type {{[key: number|string]: TileAnimation[]}} */
		this.animations = {};

		this.ready = this.getReady({
			src, columns, image, imageheight, imagewidth, margin
			, name, spacing, tilecount, tileheight, tilewidth, tiles
		});
	}

	/**
	 * Load or parse a Tileset
	 * @param {object} param0 - Named params
	 * @param {string|URL} [param0.src] - The URL of the Tileset to load
	 * @param {number} [param0.columns] - The number of columns in the Tileset
	 * @param {string|URL} [param0.image] - The URL to the Tileset image
	 * @param {number} [param0.imageheight] - The width of the Tileset image
	 * @param {number} [param0.imagewidth] - The width of the Tileset image
	 * @param {number} [param0.margin] - The around each tile
	 * @param {string} [param0.name] - The name of the Tileset
	 * @param {number} [param0.spacing] - The spacing between each tile
	 * @param {number} [param0.tilecount] - The number of tiles
	 * @param {number} [param0.tilewidth] - The width of one tile
	 * @param {number} [param0.tileheight] - The height of one tile
	 * @param {Array<Tile>} [param0.tiles] - The tile GIDs
	 */
	async getReady({
		src, columns, image, imageheight, imagewidth, margin, name
		, spacing, tilecount, tileheight, tilewidth, tiles
	}){
		if(src)
		{
			src = String(src);

			if(!cacheMain.has(src)) cacheMain.set(src, fetch(src));

			const loadMain = await cacheMain.get(src);

			if(!loadMain)
			{
				throw new Error('Could not load Tileset.');
			}

			({columns, image, imageheight, imagewidth, margin, name,
				spacing, tilecount, tileheight, tilewidth, tiles
			} = await loadMain.clone().json());

			if(tiles)
			for(const tile of tiles)
			{
				tile.id += this.firstGid;
			}
		}

		this.columns = columns ?? 1;
		this.margin  = margin ?? 0;
		this.name    = name ?? image;
		this.spacing = spacing ?? 0;

		/** @type {Tile[]} */
		this.tiles   = tiles ?? [];

		this.tileCount = tilecount ?? 1;

		let imgSrc = null;

		if(image)
		{
			if(this.src)
			{
				imgSrc = new URL(image, this.src);
			}
			else if(this.map)
			{
				imgSrc = new URL(image, this.map.src);
			}
			else
			{
				imgSrc = new URL(image, globalThis.location.href);
			}
		}

		this.tileWidth = 1;
		this.tileHeight = 1;

		if(imgSrc)
		{
			if(cacheImages.has(imgSrc.href))
			{
				/** @type {HTMLImageElement} */
				this.image = await cacheImages.get(imgSrc.href);
			}
			else
			{
				const image = new Image;
				image.src = imgSrc.href;
				const loadImage = new Promise(accept => image.onload = () => accept(image));
				cacheImages.set(imgSrc.href, loadImage);

				/** @type {HTMLImageElement} */
				this.image = await loadImage;
			}

			if(!this.image)
			{
				throw new Error('Could not load Tileset image.');
			}

			this.imageWidth  = imagewidth ?? this.image.width ?? 1;
			this.imageHeight = imageheight ?? this.image.height ?? 1;

			this.tileWidth  = tilewidth ?? this.imageWidth;
			this.tileHeight = tileheight ?? this.imageHeight;

			this.rows = Math.ceil(this.imageHeight / this.tileHeight) || 1;

			for(const tile of this.tiles)
			{
				if(tile.animation)
				{
					this.animations[tile.id] = tile.animation;
				}
			}
		}
	}
}
