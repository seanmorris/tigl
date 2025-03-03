export class SpriteSheet
{
	constructor()
	{
		this.imageUrl = '/spritesheet.png';
		this.boxesUrl = '/spritesheet.json';
		this.vertices = {};
		this.frames   = {};
		this.width    = 0;
		this.height   = 0;

		let request   = new Request(this.boxesUrl);

		let sheetLoader = fetch(request)
		.then((response)=>response.json())
		.then((boxes) => this.boxes = boxes);

		let imageLoader = new Promise((accept)=>{
			this.image        = new Image();
			this.image.src    = this.imageUrl;
			this.image.onload = ()=>{
				accept();
			};
		});

		this.ready = Promise.all([sheetLoader, imageLoader])
		.then(() => this.processImage())
		.then(() => this);
	}

	processImage()
	{
		if(!this.boxes || !this.boxes.frames)
		{
			return;
		}

		const canvas  = document.createElement('canvas');

		canvas.width  = this.image.width;
		canvas.height = this.image.height;

		const context = canvas.getContext("2d");

		context.drawImage(this.image, 0, 0);

		const framePromises = [];

		for(let i in this.boxes.frames)
		{
			const subCanvas  = document.createElement('canvas');

			subCanvas.width  = this.boxes.frames[i].frame.w;
			subCanvas.height = this.boxes.frames[i].frame.h;

			const subContext = subCanvas.getContext("2d");

			if(this.boxes.frames[i].frame)
			{
				subContext.putImageData(context.getImageData(
					this.boxes.frames[i].frame.x
					, this.boxes.frames[i].frame.y
					, this.boxes.frames[i].frame.w
					, this.boxes.frames[i].frame.h
				), 0, 0);
			}

			if(this.boxes.frames[i].text)
			{
				subContext.fillStyle = this.boxes.frames[i].color || 'white';

				subContext.font = this.boxes.frames[i].font
					|| `${this.boxes.frames[i].frame.h}px sans-serif`;
				subContext.textAlign = 'center';

				subContext.fillText(
					this.boxes.frames[i].text
					, this.boxes.frames[i].frame.w / 2
					, this.boxes.frames[i].frame.h
					, this.boxes.frames[i].frame.w
				);

				subContext.textAlign = null;
				subContext.font      = null;
			}

			framePromises.push(new Promise((accept)=>{
				subCanvas.toBlob((blob)=>{
					this.frames[this.boxes.frames[i].filename] = URL.createObjectURL(blob);

					accept(this.frames[this.boxes.frames[i].filename]);
				});
			}));


			// let u1 = this.boxes.frames[i].frame.x / this.image.width;
			// let v1 = this.boxes.frames[i].frame.y / this.image.height;

			// let u2 = (this.boxes.frames[i].frame.x + this.boxes.frames[i].frame.w)
			// 	/ this.image.width;

			// let v2 = (this.boxes.frames[i].frame.y + this.boxes.frames[i].frame.h)
			// 	/ this.image.height;

			// this.vertices[this.boxes.frames[i].filename] = {
			// 	u1,v1,u2,v2
			// };
		}

		return Promise.all(framePromises);
	}

	getVertices(filename)
	{
		return this.vertices[filename];
	}

	getFrame(filename)
	{
		return this.frames[filename];
	}

	getFrames(frameSelector)
	{
		if(Array.isArray(frameSelector))
		{
			return frameSelector.map((name)=>this.getFrame(name));
		}

		return this.getFramesByPrefix(frameSelector);
	}

	getFramesByPrefix(prefix)
	{
		let frames = [];

		for(let i in this.frames)
		{
			if(i.substring(0, prefix.length) !== prefix)
			{
				continue;
			}

			frames.push(this.frames[i]);
		}

		return frames;
	}

	static loadTexture(gl2d, imageSrc)
	{
		const gl = gl2d.context;

		if(!this.texturePromises)
		{
			this.texturePromises = {};
		}

		if(this.texturePromises[imageSrc])
		{
			return this.texturePromises[imageSrc];
		}

		return this.texturePromises[imageSrc] = this.loadImage(imageSrc)
		.then((image)=>{
			const texture = gl.createTexture();

			gl.bindTexture(gl.TEXTURE_2D, texture);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

			gl.texImage2D(
				gl.TEXTURE_2D
				, 0
				, gl.RGBA
				, gl.RGBA
				, gl.UNSIGNED_BYTE
				, image
			);

			return {image, texture}
		});
	}

	static loadImage(src)
	{
		if(!this.imagePromises)
		{
			this.imagePromises = {};
		}

		if(this.imagePromises[src])
		{
			return this.imagePromises[src];
		}

		this.imagePromises[src] = new Promise((accept, reject)=>{
			const image = new Image();
			image.src   = src;
			image.addEventListener('load', (event)=>{
				accept(image);
			});
		});

		return this.imagePromises[src];
	}
}
