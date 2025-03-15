import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';

export  class Map
{
	constructor({src, spriteSheet})
	{
		this[Bindable.Prevent] = true;
		this.spriteSheet = spriteSheet;
		this.image = document.createElement("img");
		this.pixels = [];
		this.tileCount = 0;
		this.tileSetWidth = 1;
		this.tileSetHeight = 1;

		const loader = fetch(src)
		.then(response => response.json())
		.then(mapData => {
			const tilesets = mapData.tilesets && mapData.tilesets.map(t => new Tileset(t));
			return Promise.all(tilesets.map(t => t.ready)).then(() => tilesets);
		}).then(tilesets => {
			this.assemble(tilesets);
		});

		this.ready = loader;
	}

	assemble(tilesets)
	{
		tilesets.sort((a, b) => a.firstGid - b.firstGid);

		const tileTotal = this.tileCount = tilesets.reduce((a, b) => a.tileCount + b.tileCount, {tileCount: 0});

		const size = Math.ceil(Math.sqrt(tileTotal));

		console.log(tileTotal, size, tilesets);

		const destination = document.createElement('canvas');
		this.tileSetWidth  = destination.width  = size * 32;
		this.tileSetHeight = destination.height = Math.ceil(tileTotal / size) * 32;

		const ctxDestination = destination.getContext('2d');

		let xDestination = 0;
		let yDestination = 0;

		for(const tileset of tilesets)
		{
			let xSource = 0;
			let ySource = 0;
			const image = tileset.image;
			const source = document.createElement('canvas');

			source.width = image.width;
			source.height = image.height;

			const ctxSource = source.getContext('2d', {willReadFrequently: true});

			ctxSource.drawImage(image, 0, 0);

			for(let i = 0; i < tileset.tileCount; i++)
			{
				const tile = ctxSource.getImageData(xSource, ySource, 32, 32);

				ctxDestination.putImageData(tile, xDestination, yDestination);

				xSource += 32;
				xDestination += 32;

				if(xSource >= tileset.imageWidth)
				{
					xSource = 0;
					ySource += 32;
				}

				if(xDestination >= destination.width)
				{
					xDestination = 0;
					yDestination += 32;
				}
			}
		}

		this.pixels = ctxDestination.getImageData(0, 0, destination.width, destination.height).data;

		destination.toBlob(blob => {
			const url = URL.createObjectURL(blob);
			this.image.onload = () => URL.revokeObjectURL(url);
			this.image.src = url;
		});

		console.log(destination.toDataURL());
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
