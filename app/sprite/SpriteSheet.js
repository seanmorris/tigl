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

		let sheetLoader = fetch(request).then((response)=>{
			return response.json().then((boxes)=>{
				this.boxes = boxes;

				return true;
			});
		});

		let imageLoader = new Promise((accept)=>{
			this.image        = new Image();
			this.image.src    = this.imageUrl;
			this.image.onload = ()=>{
				accept();
			};
		});

		this.ready = Promise.all([sheetLoader, imageLoader]).then(()=>{
			return this.processImage().then(()=>{
				return this;				
			});
		});
	}
	
	processImage()
	{
		if(!this.boxes || !this.boxes.frames)
		{
			return;
		}

		let canvas, context;

		canvas        = document.createElement('canvas');

		canvas.width  = this.image.width;
		canvas.height = this.image.height;

		context       = canvas.getContext("2d");

		context.drawImage(this.image, 0, 0);

		let framePromises = [];

		for(let i in this.boxes.frames)
		{
			let subCanvas    = document.createElement('canvas');
			subCanvas.width  = this.boxes.frames[i].frame.w;
			subCanvas.height = this.boxes.frames[i].frame.h;

			let subContext = subCanvas.getContext("2d");

			subContext.putImageData(context.getImageData(
				this.boxes.frames[i].frame.x
				, this.boxes.frames[i].frame.y
				, this.boxes.frames[i].frame.w
				, this.boxes.frames[i].frame.h
			), 0, 0);

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

		this.texturePromises[imageSrc] = this.loadImage(imageSrc).then((image)=>{
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

		return this.texturePromises[imageSrc];
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
