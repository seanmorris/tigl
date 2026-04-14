const cache = new Map;

/**
 * @import { TileMap } from "../world/TileMap"
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
	 * @param {string|URL} param0.src - The URL of the Tileset to load
	 * @param {object} param0.source - Alias of `src` for compatibility
	 * @param {TileMap|undefined} param0.map - The TileMap this Tileset belongs to
	 * @param {number} param0.firstgid - The first GID in this Tileset
	 * @param {number} param0.columns - The number of columns in the Tileset
	 * @param {string|URL} param0.image - The URL to the Tileset image
	 * @param {number} param0.imageheight - The width of the Tileset image
	 * @param {number} param0.imagewidth - The width of the Tileset image
	 * @param {number} param0.margin - The around each tile
	 * @param {string} param0.name - The name of the Tileset
	 * @param {number} param0.spacing - The spacing between each tile
	 * @param {number} param0.tilecount - The number of tiles
	 * @param {number} param0.tilewidth - The width of one tile
	 * @param {number} param0.tileheight - The height of one tile
	 * @param {Array<number>} param0.tiles - The tile GIDs
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
			this.src = new URL(src, location);
		}

		this.map = map;

		this.animations = {};

		this.ready = this.getReady({
			src, columns, image, imageheight, imagewidth, margin
			, name, spacing, tilecount, tileheight, tilewidth, tiles
		});
	}

	/**
	 * Load or parse a Tileset
	 * @param {object} param0 - Named params
	 * @param {string|URL} param0.src - The URL of the Tileset to load
	 * @param {number} param0.columns - The number of columns in the Tileset
	 * @param {string|URL} param0.image - The URL to the Tileset image
	 * @param {number} param0.imageheight - The width of the Tileset image
	 * @param {number} param0.imagewidth - The width of the Tileset image
	 * @param {number} param0.margin - The around each tile
	 * @param {string} param0.name - The name of the Tileset
	 * @param {number} param0.spacing - The spacing between each tile
	 * @param {number} param0.tilecount - The number of tiles
	 * @param {number} param0.tilewidth - The width of one tile
	 * @param {number} param0.tileheight - The height of one tile
	 * @param {Array<number>} param0.tiles - The tile GIDs
	 */
	async getReady({
		src, columns, image, imageheight, imagewidth, margin, name
		, spacing, tilecount, tileheight, tilewidth, tiles
	}){
		if(src)
		{
			if(!cache.has(src)) cache.set(src, fetch(src));

			({columns, image, imageheight, imagewidth, margin, name,
				spacing, tilecount, tileheight, tilewidth, tiles
			} = await (await cache.get(src)).clone().json());

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
		this.tiles   = tiles ?? [];

		this.tileCount = tilecount ?? 1;

		let imgSrc = null;

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
			imgSrc = new URL(image, location);
		}

		if(!cache.has(imgSrc.href))
		{
			const image = new Image;
			image.src = imgSrc;
			cache.set(imgSrc.href, new Promise(
				accept => image.onload = () => accept(image)
			));
		}

		this.image = await cache.get(imgSrc.href);

		this.imageWidth  = imagewidth ?? this.image.width;
		this.imageHeight = imageheight ?? this.image.height;

		this.tileWidth  = tilewidth ?? this.imageWidth;
		this.tileHeight = tileheight ?? this.imageHeight;

		this.rows = Math.ceil(imageheight / tileheight) || 1;

		for(const tile of this.tiles)
		{
			if(tile.animation)
			{
				this.animations[tile.id] = tile.animation;
			}
		}
	}
}
