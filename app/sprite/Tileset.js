const cache = new Map;

export class Tileset
{
	constructor({
		source, src, map, firstgid, columns, image, imageheight, imagewidth
		, margin , name, spacing, tilecount, tileheight, tilewidth, tiles
	}){
		this.firstGid = firstgid ?? 0;
		this.tileCount  = tilecount ?? 0;
		this.tileHeight = tileheight ?? 0;
		this.tileWidth  = tilewidth ?? 0;

		src = src ?? source;

		if(src)
		{
			this.src = new URL(src, location);
		}

		this.map = map;

		this.animations = {};

		this.ready = this.getReady({
			src, columns, image, imageheight, imagewidth, margin
			, name, spacing, tilecount, tileheight, tilewidth, tiles
		});
	}

	async getReady({
		src, columns, image, imageheight, imagewidth, margin, name
		, spacing, tilecount, tileheight, tilewidth, tiles
	}){
		if(src)
		{
			if(!cache.has(src))
			{
				console.log(src);
				cache.set(src, fetch(src));
			}

			({columns, image, imageheight, imagewidth, margin, name,
				spacing, tilecount, tileheight, tilewidth, tiles
			} = await (await cache.get(src)).clone().json());

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

		this.tileCount = tilecount ?? 1;

		let imgSrc = null;

		if(this.src)
		{
			imgSrc = new URL(image, this.src);
		}
		else if(this.map)
		{
			imgSrc = new URL(image, this.map.src);
		}
		else
		{
			imgSrc = new URL(image, location);
		}

		if(!cache.has(imgSrc.href))
		{
			const image = new Image;
			image.src = imgSrc;
			cache.set(imgSrc.href, new Promise(
				accept => image.onload = () => accept(image)
			));
		}

		this.image = await cache.get(imgSrc.href);

		this.imageWidth  = imagewidth ?? this.image.width;
		this.imageHeight = imageheight ?? this.image.height;

		this.tileWidth  = tilewidth ?? this.imageWidth;
		this.tileHeight = tileheight ?? this.imageHeight;

		this.rows = Math.ceil(imageheight / tileheight) || 1;

		for(const tile of this.tiles)
		{
			if(tile.animation)
			{
				this.animations[tile.id] = tile.animation;
			}
		}
	}
}
