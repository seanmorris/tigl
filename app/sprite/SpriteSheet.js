import { Tileset } from "./Tileset";

export class SpriteSheet extends Tileset
{
	constructor(tilesetData)
	{
		super(tilesetData);

		this.animations = { default: [{tileid: 0, duration: Infinity}] };
		this.canvas = document.createElement('canvas');
		this.context = this.canvas.getContext("2d", {willReadFrequently: true});
		this.frames = [];

		this.ready = this.ready.then(() => {
			this.processImage();

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

	processImage()
	{
		this.canvas.width  = this.image.width;
		this.canvas.height = this.image.height;

		this.context.drawImage(this.image, 0, 0);

		for(let i = 0; i < this.tileCount; i++)
		{
			this.frames[i] = this.getFrame(i)
		}
	}

	getFrame(frameId)
	{
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
