export class SpriteSheet 
{
	constructor(ready)
	{
		this.imageUrl = '/spritesheet.png';
		this.boxesUrl = '/spritesheet.json';

		this.frames = {};

		let request = new Request(this.boxesUrl);

		fetch(request).then((response)=>{
			response.json().then((boxes)=>{
				this.boxes = boxes;
			});
		});

		this.image        = new Image();
		this.image.onload = ()=>{
			this.processImage();
			ready ? ready(this) : null;
		};
		this.image.src    = this.imageUrl;

		console.log(this);
	}
	
	processImage()
	{
		if(!this.boxes.frames)
		{
			return;
		}

		var canvas, context;

		canvas = document.createElement('canvas');
		canvas.width = this.image.width;
		canvas.height = this.image.height;

		context = canvas.getContext("2d");

		context.drawImage(this.image, 0, 0);

		// console.log(context.getImageData(0,0,this.image.width,this.image.height));

		for(var i in this.boxes.frames)
		{
			var subCanvas  = document.createElement('canvas');
			subCanvas.width = this.boxes.frames[i].frame.w;
			subCanvas.height = this.boxes.frames[i].frame.h;

			var subContext = subCanvas.getContext("2d");

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
}
