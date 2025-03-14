export class Tileset
{
	constructor({
		columns, firstgid, image, imageheight, imagewidth
		, margin, name, spacing, tilecount, tileheight, tilewidth,
	}){
		this.image = new Image;
		this.ready = new Promise(accept => this.image.onload = () => accept());
		this.image.src = image;

		this.columns = columns;
		this.firstGid = firstgid;
		this.imageWidth = imagewidth;
		this.imageHeight = imageheight;
		this.margin = margin;
		this.name = name;
		this.spacing = spacing;
		this.tileCount = tilecount;
		this.tileHeight = tileheight;
		this.tileWidth = tilewidth;
	}
}
