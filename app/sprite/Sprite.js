import { Bindable } from "curvature/base/Bindable";
import { SpriteSheet } from "./SpriteSheet";
import { Matrix } from "../math/Matrix";
import { Camera } from "./Camera";

export class Sprite
{
	constructor({src, color, pixels, session, spriteSheet, x, y, z, width, height, originalWidth, originalHeight, tiled = false})
	{
		this[Bindable.Prevent] = true;

		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;

		this.currentAnimation = null;

		this.width  = 32 || width;
		this.height = 32 || height;

		this.originalWidth = originalWidth ?? this.width;
		this.originalHeight = originalHeight ?? this.height;
		this.tiled = tiled;

		this.scale   = 1;
		this.scaleX  = 1;
		this.scaleY  = 1;
		this.theta   = 0;
		this.shearX  = 0;
		this.shearY  = 0;

		this.xCenter = 0.5;
		this.yCenter = 1.0;

		this.visible = false;
		this.moving = false;

		this.textures = [];
		this.frames = [];
		this.currentDelay = 0;
		this.currentFrame = 0;
		this.currentFrames = '';

		this.speed    = 0;
		this.maxSpeed = 4;

		this.RIGHT	= 0;
		this.DOWN	= 1;
		this.LEFT	= 2;
		this.UP		= 3;

		this.EAST	= this.RIGHT;
		this.SOUTH	= this.DOWN;
		this.WEST	= this.LEFT;
		this.NORTH	= this.UP;

		this.region = [0, 0, 0, 1];

		this.spriteBoard = session.spriteBoard;

		const gl = this.spriteBoard.gl2d.context;

		this.texture = gl.createTexture();

		const singlePixel = color
			? new Uint8Array(color)
			: new Uint8Array([
				Math.trunc(Math.random() * 255)
				, Math.trunc(Math.random() * 255)
				, Math.trunc(Math.random() * 255)
				, 255
			]);

		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, 1
			, 1
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, singlePixel
		);

		if(src && !spriteSheet)
		{
			spriteSheet = new SpriteSheet({image: src});
		}

		this.spriteSheet = spriteSheet;

		if(spriteSheet)
		{
			spriteSheet.ready.then(() => {
				this.width = spriteSheet.tileWidth;
				this.height = spriteSheet.tileHeight;

				this.originalWidth = originalWidth ?? this.width;
				this.originalHeight = originalHeight ?? this.height;

				this.texture = this.createTexture( spriteSheet.getFrame(0) );

				for(let i = 0; i < spriteSheet.tileCount; i++)
				{
					this.textures[i] = this.createTexture( spriteSheet.getFrame(i) );
				}

				this.changeAnimation('default');
			});
		}
	}

	draw(delta)
	{
		if(this.currentDelay > 0)
		{
			this.currentDelay -= delta;
		}
		else
		{
			this.currentFrame++;

			if(this.spriteSheet && this.spriteSheet.animations[this.currentAnimation])
			{
				const animation = this.spriteSheet.animations[this.currentAnimation];

				if(this.currentFrame >= animation.length)
				{
					this.currentFrame = this.currentFrame % animation.length;
				}

				const textureId = animation[this.currentFrame].tileid;

				const texture = this.textures[ textureId ];

				if(texture)
				{
					this.currentDelay = animation[this.currentFrame].duration;
					this.texture = texture;
				}
			}
		}

		const gl = this.spriteBoard.gl2d.context;
		const zoom = this.spriteBoard.zoomLevel;
		this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

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

	changeAnimation(name)
	{
		if(!this.spriteSheet ||!this.spriteSheet.animations[name])
		{
			// console.warn(`Animation ${name} not found.`);
			return;
		}

		if(this.currentAnimation !== name)
		{
			this.currentAnimation = name;
			this.currentDelay = 0;
		}
	}

	createTexture(pixels)
	{
		const gl = this.spriteBoard.gl2d.context;
		const texture = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, texture);

		if(this.tiled)
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		}
		else
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, this.width
			, this.height
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, pixels
		);

		gl.bindTexture(gl.TEXTURE_2D, null);

		return texture;
	}

	setRectangle(x, y, width, height, transform = [])
	{
		const gl = this.spriteBoard.gl2d.context;
		const zoom = this.spriteBoard.zoomLevel;

		const xra = this.width / this.originalWidth;
		const yra = this.height / this.originalHeight;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			xra, 0.0,
			0.0, yra,
			0.0, yra,
			xra, 0.0,
			xra, yra,
		]), gl.STATIC_DRAW);

		const x1 = x;
		const y1 = y;
		const x2 = x + width;
		const y2 = y + height;

		const points = new Float32Array([
			x1, y1,
			x2, y1,
			x1, y2,
			x1, y2,
			x2, y1,
			x2, y2,
		]);

		const xOff = x + width  * this.xCenter;
		const yOff = y + height * this.yCenter;

		// this.theta = performance.now() / 1000;

		const t = Matrix.transform(points, Matrix.composite(
			Matrix.translate(xOff + -width * 0.5, yOff + zoom + 16 * zoom)
			, Matrix.shearX(this.shearX)
			, Matrix.shearX(this.shearY)
			, Matrix.scale(this.scale * this.scaleX, this.scale * this.scaleY)
			, Matrix.rotate(this.theta)
			, Matrix.translate(-xOff, -yOff)
		));

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
		gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
	}
}
