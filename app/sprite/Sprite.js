import { Bindable } from "curvature/base/Bindable";
import { Camera } from "./Camera";

export class Sprite
{
	constructor({src, spriteBoard, spriteSheet})
	{
		this[Bindable.Prevent] = true;
		
		this.z      = 0;
		this.x      = 0;
		this.y      = 0;

		this.width  = 0;
		this.height = 0;
		this.scale  = 1;

		this.frames        = [];
		this.frameDelay    = 4;
		this.currentDelay  = this.frameDelay;
		this.currentFrame  = 0;
		this.currentFrames = '';

		this.speed    = 0;
		this.maxSpeed = 8;

		this.moving = false;

		this.RIGHT	= 0;
		this.DOWN	= 1;
		this.LEFT	= 2;
		this.UP		= 3;

		this.EAST	= this.RIGHT;
		this.SOUTH	= this.DOWN;
		this.WEST	= this.LEFT;
		this.NORTH	= this.UP;

		this.standing = {
			'north': [
				'player_standing_north.png'
			]
			, 'south': [
				'player_standing_south.png'
			]
			, 'west': [
				'player_standing_west.png'
			]
			, 'east': [
				'player_standing_east.png'
			]
		};

		this.walking = {
			'north': [
				'player_walking_north.png'
				, 'player_walking_north.png'
				, 'player_standing_north.png'
				, 'player_walking_north2.png'
				, 'player_walking_north2.png'
				, 'player_standing_north.png'
			]
			, 'south': [
				'player_walking_south.png'
				, 'player_walking_south.png'
				, 'player_standing_south.png'
				, 'player_walking_south2.png'
				, 'player_walking_south2.png'
				, 'player_standing_south.png'

			]
			, 'west': [
				'player_walking_west.png'
				, 'player_walking_west.png'
				, 'player_standing_west.png'
				, 'player_standing_west.png'
				, 'player_walking_west2.png'
				, 'player_walking_west2.png'
				, 'player_standing_west.png'
				, 'player_standing_west.png'
			]
			, 'east': [
				'player_walking_east.png'
				, 'player_walking_east.png'
				, 'player_standing_east.png'
				, 'player_standing_east.png'
				, 'player_walking_east2.png'
				, 'player_walking_east2.png'
				, 'player_standing_east.png'
				, 'player_standing_east.png'
			]
		};

		this.spriteBoard = spriteBoard;

		const gl = this.spriteBoard.gl2d.context;

		this.texture = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		const r = ()=>parseInt(Math.random()*255);

		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, 1
			, 1
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, new Uint8Array([r(), r(), 0, 255])
		);

		this.spriteSheet = spriteSheet;

		this.spriteSheet.ready.then((sheet)=>{
			const frame = this.spriteSheet.getFrame(src);

			if(frame)
			{
				Sprite.loadTexture(this.spriteBoard.gl2d, this.spriteSheet, frame).then((args)=>{
					this.texture = args.texture;
					this.width   = args.image.width * this.scale;
					this.height  = args.image.height * this.scale;
				});
			}
		});
	}

	draw()
	{
		this.frameDelay = this.maxSpeed - Math.abs(this.speed);
		if(this.frameDelay > this.maxSpeed)
		{
			this.frameDelay = this.maxSpeed;
		}

		if(this.currentDelay <= 0)
		{
			this.currentDelay = this.frameDelay;
			this.currentFrame++;
		}
		else
		{
			this.currentDelay--;
		}

		if(this.currentFrame >= this.frames.length)
		{
			this.currentFrame = this.currentFrame - this.frames.length;
		}

		const frame = this.frames[ this.currentFrame ];

		if(frame)
		{
			this.texture = frame.texture;
			this.width  = frame.width * this.scale;
			this.height = frame.height * this.scale;
		}

		const gl = this.spriteBoard.gl2d.context;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		this.setRectangle(
			this.x * this.spriteBoard.gl2d.zoomLevel + -Camera.x + (Camera.width * this.spriteBoard.gl2d.zoomLevel / 2)
			, this.y * this.spriteBoard.gl2d.zoomLevel + -Camera.y + (Camera.height * this.spriteBoard.gl2d.zoomLevel / 2) + -this.height * 0.5 * this.spriteBoard.gl2d.zoomLevel
			, this.width * this.spriteBoard.gl2d.zoomLevel
			, this.height * this.spriteBoard.gl2d.zoomLevel
		);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	setFrames(frameSelector)
	{
		let framesId = frameSelector.join(' ');

		if(this.currentFrames === framesId)
		{
			return;
		}

		this.currentFrames = framesId;

		this.spriteSheet.ready.then((sheet)=>{

			const frames = sheet.getFrames(frameSelector).map((frame)=>{

				return Sprite.loadTexture(this.spriteBoard.gl2d, this.spriteSheet, frame).then((args)=>{
					return {
						texture:  args.texture
						, width:  args.image.width
						, height: args.image.height
					}
				});

			});

			Promise.all(frames).then((frames)=>{
				this.frames = frames;
			});

		});
	}

	static loadTexture(gl2d, spriteSheet, imageSrc)
	{
		const gl = gl2d.context;

		if(!this.promises)
		{
			this.promises = {};
		}

		if(this.promises[imageSrc])
		{
			return this.promises[imageSrc];
		}

		// console.log(imageSrc);

		this.promises[imageSrc] = Sprite.loadImage(imageSrc).then((image)=>{
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

		return this.promises[imageSrc];
	}

	static loadImage(src)
	{
		return new Promise((accept, reject)=>{
			const image = new Image();
			image.src   = src;
			image.addEventListener('load', (event)=>{
				accept(image);
			});
		});
	}

	setRectangle(x, y, width, height)
	{
		const gl = this.spriteBoard.gl2d.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.positionBuffer);

		const x1 = x;
		const x2 = x + width;
		const y1 = y;
		const y2 = y + height;
		
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			x1, y1, this.z,
			x2, y1, this.z,
			x1, y2, this.z,
			x1, y2, this.z,
			x2, y1, this.z,
			x2, y2, this.z,
		]), gl.STREAM_DRAW);
	}
}
