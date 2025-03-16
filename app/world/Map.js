import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';

export  class Map
{
	constructor({src, spriteSheet})
	{
		this[Bindable.Prevent] = true;
		this.spriteSheet = spriteSheet;
		this.image = document.createElement('img');
		this.canvas = document.createElement('canvas');
		this.context = this.canvas.getContext('2d', {willReadFrequently: true});
		this.pixels = [];
		this.tileCount = 0;
		this.tileWidth = 0;
		this.tileHeight = 0;
		this.tileSetWidth = 0;
		this.tileSetHeight = 0;

		this.layers = [];
		this.width  = 0;
		this.height = 0;

		this.ready = this.getReady(src);
	}

	async getReady(src)
	{
		const mapData = await (await fetch(src)).json();

		this.layers     = mapData.layers;
		this.width      = mapData.width;
		this.height     = mapData.height;
		this.tileWidth  = mapData.tilewidth;
		this.tileHeight = mapData.tileheight;
		const tilesets  = mapData.tilesets.map(t => new Tileset(t));

		await Promise.all(tilesets.map(t => t.ready));

		this.assemble(tilesets);
	}

	assemble(tilesets)
	{
		tilesets.sort((a, b) => a.firstGid - b.firstGid);

		const tileTotal = this.tileCount = tilesets.reduce((a, b) => a.tileCount + b.tileCount, {tileCount: 0});

		const size = Math.ceil(Math.sqrt(tileTotal));

		console.log(this);

		const destination = document.createElement('canvas');
		this.tileSetWidth  = destination.width  = size * this.tileWidth;
		this.tileSetHeight = destination.height = Math.ceil(tileTotal / size) * this.tileHeight;

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
				const tile = ctxSource.getImageData(xSource, ySource, this.tileWidth, this.tileHeight);

				ctxDestination.putImageData(tile, xDestination, yDestination);

				xSource += this.tileWidth;
				xDestination += this.tileWidth;

				if(xSource >= tileset.imageWidth)
				{
					xSource = 0;
					ySource += this.tileHeight;
				}

				if(xDestination >= destination.width)
				{
					xDestination = 0;
					yDestination += this.tileHeight;
				}
			}
		}

		this.pixels = ctxDestination.getImageData(0, 0, destination.width, destination.height).data;

		destination.toBlob(blob => {
			const url = URL.createObjectURL(blob);
			this.image.onload = () => URL.revokeObjectURL(url);
			this.image.src = url;
		});

		// console.log(destination.toDataURL());

		for(const layer of this.layers)
		{
			const tileValues = new Uint32Array(layer.data.map(t => -1 + t));
			const tilePixels = new Uint8ClampedArray(tileValues.buffer);

			for(let i = 3; i < tilePixels.length; i +=4)
			{
				tilePixels[i] = 0xFF;
			}

			this.canvas.width = this.width;
			this.canvas.height = this.height;
			this.context.putImageData(new ImageData(tilePixels, this.width, this.height), 0, 0);
		}
	}

	getSlice(x, y, width, height)
	{
		return this.context.getImageData(x, y, width, height).data;
	}
}
