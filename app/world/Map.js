import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';

export class Map
{
	constructor({src})
	{
		this[Bindable.Prevent] = true;
		this.image = document.createElement('img');
		this.pixels = [];
		this.tileCount = 0;

		this.backgroundColor = null;

		this.properties = {};

		this.canvases = new window.Map;
		this.contexts = new window.Map;

		this.tileLayers   = [];
		this.imageLayers  = [];
		this.objectLayers = [];

		this.xWorld = 0;
		this.yWorld = 0;

		this.width  = 0;
		this.height = 0;

		this.tileWidth  = 0;
		this.tileHeight = 0;

		this.tileSetWidth  = 0;
		this.tileSetHeight = 0;

		this.ready = this.getReady(src);
	}

	async getReady(src)
	{
		const mapData = await (await fetch(src)).json();

		this.tileLayers   = mapData.layers.filter(layer => layer.type === 'tilelayer');
		this.imageLayers  = mapData.layers.filter(layer => layer.type === 'imagelayer');
		this.objectLayers = mapData.layers.filter(layer => layer.type === 'objectlayer');

		this.backgroundColor = mapData.backgroundcolor;

		if(mapData.properties)
		for(const property of mapData.properties)
		{
			this.properties[ property.name ] = property.value;
		}

		if(this.properties.backgroundColor)
		{
			this.backgroundColor = this.properties.backgroundColor;
		}

		const tilesets = mapData.tilesets.map(t => new Tileset(t));

		this.width  = mapData.width;
		this.height = mapData.height;

		this.tileWidth  = mapData.tilewidth;
		this.tileHeight = mapData.tileheight;

		await Promise.all(tilesets.map(t => t.ready));

		this.assemble(tilesets);

		return this;
	}

	assemble(tilesets)
	{
		tilesets.sort((a, b) => a.firstGid - b.firstGid);

		const tileTotal = this.tileCount = tilesets.reduce((a, b) => a.tileCount + b.tileCount, {tileCount: 0});

		const size = Math.ceil(Math.sqrt(tileTotal));

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

		for(const layer of this.tileLayers)
		{
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d', {willReadFrequently: true});

			this.canvases.set(layer, canvas);
			this.contexts.set(layer, context);

			const tileValues = new Uint32Array(layer.data.map(t => 0 + t));
			const tilePixels = new Uint8ClampedArray(tileValues.buffer);

			for(let i = 3; i < tilePixels.length; i +=4)
			{
				tilePixels[i] = 0xFF;
			}

			canvas.width = this.width;
			canvas.height = this.height;
			context.putImageData(new ImageData(tilePixels, this.width, this.height), 0, 0);
		}
	}

	getSlice(x, y, width, height)
	{
		return this.contexts.values().map(context => context.getImageData(x, y, width, height).data);
	}
}
