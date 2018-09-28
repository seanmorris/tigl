import { Sprite } from '../gl2d/Sprite';

export class Floor
{
	constructor(gl2d, args)
	{
		this.gl2d   = gl2d;
		this.sprites = [];

		this.resize(60, 34);
		// this.resize(16, 16);
	}

	resize(width, height)
	{
		this.width  = width;
		this.height = height;

		for(let x = 0; x < width; x++)
		{
			for(let y = 0; y < height; y++)
			{
				const sprite = new Sprite(this.gl2d, '/floorTile.png');

				sprite.x = 32 * x;
				sprite.y = 32 * y;

				this.sprites.push(sprite);
			}
		}
	}

	draw()
	{
		this.sprites.map(s => s.draw());
	}
}