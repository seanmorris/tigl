export class Tileset
{
	constructor({
		source, firstgid, columns, image, imageheight, imagewidth, margin
		, name, spacing, tilecount, tileheight, tilewidth, tiles
	}){
		this.firstGid = firstgid;

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

		this.image = new Image;
		this.image.src = image;

		this.columns = columns;
		this.imageWidth = imagewidth;
		this.imageHeight = imageheight;
		this.margin = margin;
		this.name = name;
		this.spacing = spacing;
		this.tileCount = tilecount;
		this.tileHeight = tileheight;
		this.tileWidth = tilewidth;
		this.tiles = tiles ?? [];

		console.log(this);

		return new Promise(accept => this.image.onload = () => accept());
	}
}
