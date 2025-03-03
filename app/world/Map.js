import { SpriteSheet } from '../sprite/SpriteSheet';
import { Injectable  } from '../inject/Injectable';

export  class Map
extends Injectable.inject({SpriteSheet})
{
	constructor()
	{
		super();

		this.tiles = {};
	}

	getTile(x, y, layer = 0)
	{
		if(this.tiles[`${x},${y}--${layer}`])
		{
			return [
				this.SpriteSheet.getFrame(this.tiles[`${x},${y}--${layer}`])
			];
		}

		let split = 4;
		let second = 'rock_4.png';

		if((x % split === 0) && (y % split === 0))
		{
			second = 'cheese.png'
		}

		return [
			this.SpriteSheet.getFrame('floorTile.png')
		];

		return [
			this.SpriteSheet.getFrame('floorTile.png')
			, this.SpriteSheet.getFrame(second)
		];
	}

	setTile(x, y, image, layer = 0)
	{
		this.tiles[`${x},${y}--${layer}`] = image;
	}

	export()
	{
		console.log(JSON.stringify(this.tiles));
	}

	import(input)
	{
		input = `{"-2,11":"lava_center_middle.png","-1,11":"lava_center_middle.png","0,11":"lava_center_middle.png"}`;

		this.tiles = JSON.parse(input);

		// console.log(JSON.parse(input));
	}
}


// {"-2,11":"lava_center_middle.png","-1,11":"lava_center_middle.png","0,11":"lava_center_middle.png"}