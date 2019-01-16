import { Bindable    } from 'curvature/base/Bindable';
import { Keyboard    } from 'curvature/input/Keyboard'
import { SpriteSheet } from './SpriteSheet';

export class Sprite
{
	constructor(gl2d, imageSrc, altImageSrc = null)
	{
		this.gl2d   = gl2d;

		this.x      = 960;
		this.y      = 548;
		this.z      = 0;
		this.x      = 0;
		this.y      = 0;

		this.width  = 32;
		this.height = 48;

		this.frames       = [];
		this.frameDelay   = 4;
		this.currentDelay = this.frameDelay;
		this.currentFrame = 0;

		this.speed    = 0;
		this.maxSpeed = 29;

		this.moving = false;

		this.RIGHT	= 0;
		this.DOWN	= 1;
		this.LEFT	= 2;
		this.UP		= 3;

		this.director = this.DOWN;

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

		const gl = gl2d.context;

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

		Sprite.loadTexture(gl2d, imageSrc).then((args)=>{
			this.texture = args.texture;
			this.texture1 = args.texture;

			this.width  = args.image.width;
			this.height = args.image.height;
		});

		if(altImageSrc)
		{
			this.keyboard = new Keyboard;

			this.keyboard.keys.bindTo((v,k,t,d)=>{
				this.keyPress(k,v,t[k]);
			});

			Sprite.loadTexture(gl2d, altImageSrc).then((args)=>{
				this.texture2 = args.texture;

				this.width  = args.image.width;
				this.height = args.image.height;
			});

			this.spriteSheet = new SpriteSheet();

			this.gl2d.moveCamera(this.x, this.y);
		}
	}

	simulate()
	{
		if(this.moving == false && this.spriteSheet)
		{
			this.setFrames(this.standing.south);
		}

		// this.frameDelay = this.maxSpeed - this.speed;

		// if(this.frameDelay > 8)
		// {
		// 	this.frameDelay = 8;
		// }

		// console.log(this.frameDelay);

		if(this.currentDelay == 0)
		{
			this.currentDelay = this.frameDelay || 2;
			this.currentFrame++;
		}
		else
		{
			this.currentDelay--;
		}

		if(this.currentFrame >= this.frames.length)
		{
			this.currentFrame = 0;
		}

		const frame = this.frames[ this.currentFrame ];

		if(frame)
		{
			this.texture = frame.texture;

			this.width  = frame.width;
			this.height = frame.height;
		}

		if(this.direction == this.UP || this.direction == this.DOWN)
		{
			this.y += this.speed;
		}
		if(this.direction == this.LEFT || this.direction == this.RIGHT)
		{
			this.x += this.speed;
		}

		if(this.keyboard)
		{
			this.keyboard.update();
		}
	}

	draw()
	{
		const gl = this.gl2d.context;

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.useProgram(this.gl2d.program);

		gl.enableVertexAttribArray(this.gl2d.positionLocation);

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.enableVertexAttribArray(this.gl2d.texCoordLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);

		gl.vertexAttribPointer(
			this.gl2d.texCoordLocation
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0,  0.0,
			1.0,  0.0,
			0.0,  1.0,
			0.0,  1.0,
			1.0,  0.0,
			1.0,  1.0,
		]), gl.STREAM_DRAW);

		this.setRectangle(
			this.x   - (this.gl2d.camera.x - parseInt(this.gl2d.camera.width  /2))
			, this.y - (this.gl2d.camera.y - parseInt(this.gl2d.camera.height /2)) - (this.height /2)
			, this.width
			, this.height
		);

		gl.uniform4f(
			this.gl2d.colorLocation
			, 1
			, 0
			, 0
			, 1
		);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	setFrames(frameSelector)
	{
		this.spriteSheet.ready.then((sheet)=>{

			const frames = sheet.getFrames(frameSelector).map((frame)=>{

				return Sprite.loadTexture(this.gl2d, frame).then((args)=>({
					texture:  args.texture
					, width:  args.image.width
					, height: args.image.height
				}));

			});

			Promise.all(frames).then((frames)=>{
				this.frames = frames;
			});

		});
	}

	static loadTexture(gl2d, imageSrc)
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
		const gl = this.gl2d.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.positionBuffer);

		gl.vertexAttribPointer(
			this.gl2d.positionLocation
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		var x1 = x;
		var x2 = x + width;
		var y1 = y;
		var y2 = y + height;
		
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			x1, y1,
			x2, y1,
			x1, y2,
			x1, y2,
			x2, y1,
			x2, y2,
		]), gl.STREAM_DRAW);
	}

	keyPress(key, value, prev)
	{
		// console.log(this.speed);

		if(value == -1)
		{
			this.speed  = 0;
			this.moving = false;
			return;
		}

		if(!value || value < 0)
		{
			return;
		}

		if(this.moving && this.moving !== key)
		{
			return;
		}

		if(prev < 0 && prev > -10)
		{
			// if(this.speed > 0)
			// {
			// 	this.speed = this.maxSpeed;
			// }
			// else
			// {
			// 	this.speed = -this.maxSpeed;
			// }
		}

		if(this.speed >= this.maxSpeed)
		{
			this.speed = this.maxSpeed;
		}

		if(this.speed <= -this.maxSpeed)
		{
			this.speed = -this.maxSpeed;
		}

		switch(key)
		{
			case 'ArrowRight':
				this.setFrames(this.walking.east);
				this.direction = this.RIGHT;
				if(value % 8 == 0)
				{
					this.speed++;
				}
				break;
			case 'ArrowDown':
				this.setFrames(this.walking.south);
				this.direction = this.DOWN;
				if(value % 8 == 0)
				{
					this.speed++;
				}
				break;
			case 'ArrowLeft':
				this.setFrames(this.walking.west);
				this.direction = this.LEFT;
				if(value % 8 == 0)
				{
					this.speed--;
				}
				break;
			case 'ArrowUp':
				this.setFrames(this.walking.north);
				this.direction = this.UP;
				if(value % 8 == 0)
				{
					this.speed--;
				}
				break;
		}

		this.moving = key;

		this.gl2d.moveCamera(this.x, this.y);
	}
}
