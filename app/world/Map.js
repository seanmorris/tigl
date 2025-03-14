import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';

export  class Map
{
	constructor({src, spriteSheet})
	{
		this.spriteSheet = spriteSheet;
		this[Bindable.Prevent] = true;
		this.tiles = {};

		const loader = fetch(src)
		.then(response => response.json())
		.then(mapData => {
			console.log(mapData);
			const tilesets = mapData.tilesets && mapData.tilesets.map(t => new Tileset(t));
			console.log(tilesets);
		})

		this.ready = loader;
	}

	getTile(x, y, layer = 0)
	{
		if(this.tiles[`${x},${y}--${layer}`])
		{
			return [
				this.spriteSheet.getFrame(this.tiles[`${x},${y}--${layer}`])
			];
		}

		let split = 4;
		let second = 'rock_4.png';

		if((x % split === 0) && (y % split === 0))
		{
			second = 'cheese.png'
		}

		if(x === -1 && y === -1)
		{
			return [
				// this.spriteSheet.getFrame('floorTile.png')
				this.spriteSheet.getFrame('box_face.png')
			];
		}

		return [
			this.spriteSheet.getFrame('floorTile.png')
			// this.spriteSheet.getFrame('box_face.png')
		];

		return [
			this.spriteSheet.getFrame('floorTile.png')
			, this.spriteSheet.getFrame(second)
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
