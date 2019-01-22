import { SpriteSheet } from '../sprite/SpriteSheet';

export class Map
{
	constructor()
	{
		this.spriteSheet = new SpriteSheet;

		this.tiles = {};
	}

	getTile(x, y)
	{
		if(this.tiles[`${x},${y}`])
		{
			return this.spriteSheet.getFrame(this.tiles[`${x},${y}`]);
		}

		// let split = 4;

		// if((x % split === 0) && (y % split === 0))
		// {
		// 	if(Math.abs(x) > 10 && Math.abs(y) > 10)
		// 	{
		// 		return this.spriteSheet.getFrame('box_face.png');
		// 	}

		// 	return this.spriteSheet.getFrame('barrel_hole.png');
		// }
		return this.spriteSheet.getFrame('floorTile.png');
	}

	setTile(x, y, image)
	{
		this.tiles[`${x},${y}`] = image;
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