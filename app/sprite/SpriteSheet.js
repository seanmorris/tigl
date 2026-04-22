import { Tileset } from "./Tileset";

/**
 * @import { TileMap } from "../world/TileMap";
 * @import { Tile } from "../sprite/Tileset";
 * @import { TileAnimation } from "../sprite/Tileset";
 */

/**
 * @class SpriteSheet
 * Represents a SpriteSheet
 * @augments Tileset
 */
export class SpriteSheet extends Tileset
{
	/**
	 * Construct a SpriteSheet object
	 * @param {object} tilesetData - Named params
	 * @param {string|URL} [tilesetData.src] - The URL of the Tileset to load
	 * @param {string|URL} [tilesetData.source] - Alias of `src` for compatibility
	 * @param {TileMap|undefined} [tilesetData.map] - The TileMap this Tileset belongs to
	 * @param {number} [tilesetData.firstgid] - The first GID in this Tileset
	 * @param {number} [tilesetData.columns] - The number of columns in the Tileset
	 * @param {string|URL} [tilesetData.image] - The URL to the Tileset image
	 * @param {number} [tilesetData.imageheight] - The width of the Tileset image
	 * @param {number} [tilesetData.imagewidth] - The width of the Tileset image
	 * @param {number} [tilesetData.margin] - The around each tile
	 * @param {string} [tilesetData.name] - The name of the Tileset
	 * @param {number} [tilesetData.spacing] - The spacing between each tile
	 * @param {number} [tilesetData.tilecount] - The number of tiles
	 * @param {number} [tilesetData.tilewidth] - The width of one tile
	 * @param {number} [tilesetData.tileheight] - The height of one tile
	 * @param {Array<Tile>} [tilesetData.tiles] - The tile GIDs
	 */
	constructor(tilesetData)
	{
		super(tilesetData);

		this.animations = /** @type { {[key: number|string]: TileAnimation[] } } */ ({});
		this.animations['default'] = [{tileid: 0, duration: Infinity}];

		this.canvas = document.createElement('canvas');
		this.context = this.canvas.getContext("2d", {willReadFrequently: true});

		/** @type Array<Uint8ClampedArray> */
		this.frames = [];

		this.ready = this.ready.then(() => {
			this.processImage();

			if(this.tiles)
			for(const tile of this.tiles)
			{
				if(tile.animation)
				{
					this.animations[tile.type] = tile.animation;
				}
				else if(tile.type)
				{
					this.animations[tile.type] = [{duration: Infinity, tileid: tile.id}];
				}
			}
		});
	}

	/**
	 * Split the source image into frames
	 * @returns {void}
	 */
	processImage()
	{
		if(!this.context || !this.image ||this.frames.length) return;

		this.canvas.width  = this.image.width;
		this.canvas.height = this.image.height;

		this.context.drawImage(this.image, 0, 0);

		for(let i = 0; i < this.tileCount; i++)
		{
			const frame = this.getFrame(i);
			if(frame) this.frames[i] = frame;
		}
	}

	/**
	 * Get pixel data for a single frame
	 * @param {number} frameId - The id of the frame
	 * @returns {Uint8ClampedArray|void} - The pixel data
	 */
	getFrame(frameId)
	{
		if(!this.context || !this.columns) return;

		frameId = frameId % this.tileCount;
		const i = frameId % this.columns;
		const j = Math.floor(frameId / this.columns);

		return this.context.getImageData(
			i * this.tileWidth
			, j * this.tileHeight
			, this.tileWidth
			, this.tileHeight
		).data;
	}
}
