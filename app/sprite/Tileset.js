export class Tileset
{
	constructor({
		source, firstgid, columns, image, imageheight, imagewidth, margin
		, name, spacing, tilecount, tileheight, tilewidth, tiles
	}){
		this.firstGid = firstgid ?? 0;
		this.tileCount  = tilecount ?? 0;
		this.tileHeight = tileheight ?? 0;
		this.tileWidth  = tilewidth ?? 0;

		this.ready = this.getReady({
			source, columns, image, imageheight, imagewidth, margin
			, name, spacing, tilecount, tileheight, tilewidth, tiles
		});
	}

	async getReady({
		source, columns, image, imageheight, imagewidth, margin, name
		, spacing, tilecount, tileheight, tilewidth, tiles
	}){
		if(source)
		{
			({columns, image, imageheight, imagewidth, margin, name,
				spacing, tilecount, tileheight, tilewidth, tiles
			} = await (await fetch(source)).json());

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

		this.tileCount  = tilecount ?? 1;

		this.image = new Image;
		this.image.src = image;

		await new Promise(accept => this.image.onload = () => accept());

		this.imageWidth  = imagewidth ?? this.image.width;
		this.imageHeight = imageheight ?? this.image.height;

		this.tileWidth  = tilewidth ?? this.imageWidth;
		this.tileHeight = tileheight ?? this.imageHeight;

		this.rows = Math.ceil(imageheight / tileheight) || 1;
	}
}
