import { Bindable } from "curvature/base/Bindable";
import { Camera } from "./Camera";
import { Split } from "../math/Split";

export class Sprite
{
	constructor({src, spriteBoard, spriteSheet, width, height, x, y, z})
	{
		this[Bindable.Prevent] = true;

		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;

		this.width  = 32 || width;
		this.height = 32 || height;
		this.scale  = 1;

		this.frames = [];
		this.frameDelay = 4;
		this.currentDelay = this.frameDelay;
		this.currentFrame = 0;
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

		this.region = [0, 0, 0, 1];

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

		const r = () => parseInt(Math.random() * 255);
		const pixel = new Uint8Array([r(), r(), r(), 255]);

		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, 1
			, 1
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, pixel
		);

		this.spriteSheet = spriteSheet;

		this.spriteSheet.ready.then((sheet)=>{
			const frame = this.spriteSheet.getFrame(src);

			if(frame)
			{
				Sprite.loadTexture(this.spriteBoard.gl2d, frame).then(args => {
					this.texture = args.texture;
					this.width = args.image.width * this.scale;
					this.height = args.image.height * this.scale;
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

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

		const zoom = this.spriteBoard.gl2d.zoomLevel;

		this.setRectangle(
			this.x * zoom + -Camera.x + (this.spriteBoard.width / 2)
			, this.y * zoom + -Camera.y + (this.spriteBoard.height / 2) + -this.height * zoom
			, this.width * zoom
			, this.height * zoom
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		this.spriteBoard.drawProgram.uniformF('u_region', ...Object.assign(this.region || [0, 0, 0], {3: 1}));

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.effectBuffer);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

		// Cleanup...
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
		return;
	}

	setFrames(frameSelector)
	{
		let framesId = frameSelector.join(' ');

		if(this.currentFrames === framesId)
		{
			return;
		}

		this.currentFrames = framesId;

		const loadTexture = frame => Sprite.loadTexture(this.spriteBoard.gl2d, frame);

		this.spriteSheet.ready.then(sheet => {
			const frames = sheet.getFrames(frameSelector).map(
				frame => loadTexture(frame).then(args => ({
					texture:  args.texture
					, width:  args.image.width
					, height: args.image.height
				}))
			);

			Promise.all(frames).then(frames => this.frames = frames);

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

			gl.bindTexture(gl.TEXTURE_2D, null);

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

	setRectangle(x, y, width, height, transform = [])
	{
		const gl = this.spriteBoard.gl2d.context;
		const zoom = this.spriteBoard.gl2d.zoomLevel;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			1.0, 0.0,
			0.0, 1.0,
			0.0, 1.0,
			1.0, 0.0,
			1.0, 1.0,
		]), gl.STATIC_DRAW);


		const x1 = x;
		const y1 = y + 32 * zoom;
		const x2 = x + width;
		const y2 = y + height + 32 * zoom;

		const points = new Float32Array([
			x1, y1,
			x2, y1,
			x1, y2,
			x1, y2,
			x2, y1,
			x2, y2,
		]);

		const xOff = x + width  * 0.5;
		const yOff = y + height * 0.5;

		const t = this.matrixTransform(points, this.matrixComposite(
			this.matrixTranslate(xOff, yOff)
			// , this.matrixScale(Math.sin(theta), Math.cos(theta))
			// , this.matrixRotate(theta)
			, this.matrixTranslate(-xOff, -yOff)
		));

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
		gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
	}

	matrixIdentity()
	{
		return [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1],
		];
	}

	matrixTranslate(dx, dy)
	{
		return [
			[1, 0, dx],
			[0, 1, dy],
			[0, 0,  1],
		];
	}

	matrixScale(dx, dy)
	{
		return [
			[dx, 0, 0],
			[0, dy, 0],
			[0, 0,  1],
		];
	}

	matrixRotate(theta)
	{
		const s = Math.sin(theta);
		const c = Math.cos(theta);

		return [
			[c, -s, 0],
			[s,  c, 0],
			[0,  0, 1],
		];
	}

	matrixShearX(s)
	{
		return [
			[1, s, 0],
			[0, 1, 0],
			[0, 0, 1],
		];
	}

	matrixShearY(s)
	{
		return [
			[1, 0, 0],
			[s, 1, 0],
			[0, 0, 1],
		];
	}

	matrixMultiply(matA, matB)
	{
		if(matA.length !== matB.length)
		{
			throw new Error('Invalid matrices');
		}

		if(matA[0].length !== matB.length)
		{
			throw new Error('Incompatible matrices');
		}

		const output = Array(matA.length).fill().map(() => Array(matB[0].length).fill(0));

		for(let i = 0; i < matA.length; i++)
		{
			for(let j = 0; j < matB[0].length; j++)
			{
				for(let k = 0; k < matA[0].length; k++)
				{
					output[i][j] += matA[i][k] * matB[k][j];
				}
			}
		}

		return output;
	}

	matrixComposite(...mats)
	{
		let output = this.matrixIdentity();

		for(let i = 0; i < mats.length; i++)
		{
			output = this.matrixMultiply(output, mats[i]);
		}

		return output;
	}

	matrixTransform(points, matrix)
	{
		const output = [];

		for(let i = 0; i < points.length; i += 2)
		{
			const point = [points[i], points[i + 1], 1];

			for(const row of matrix)
			{
				output.push(
					point[0] * row[0]
					+ point[1] * row[1]
					+ point[2] * row[2]
				)
			}
		}

		return new Float32Array(output.filter((_, k) => (1 + k) % 3));
	}
}
