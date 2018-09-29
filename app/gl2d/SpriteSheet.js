export class SpriteSheet 
{
	constructor(ready)
	{
		this.imageUrl = '/spritesheet.png';
		this.boxesUrl = '/spritesheet.json';

		this.frames = {};

		let request = new Request(this.boxesUrl);

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
				this.processImage();
				
				accept();
			};
		});

		this.ready = Promise.all([sheetLoader, imageLoader]).then(()=>this);
	}
	
	processImage()
	{
		if(!this.boxes.frames)
		{
			return;
		}

		let canvas, context;

		canvas        = document.createElement('canvas');

		canvas.width  = this.image.width;
		canvas.height = this.image.height;

		context       = canvas.getContext("2d");

		context.drawImage(this.image, 0, 0);

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

			this.frames[this.boxes.frames[i].filename] = subCanvas.toDataURL();
		}
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
}
