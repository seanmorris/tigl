import { Bindable } from "curvature/base/Bindable";
import { Camera } from "./Camera";
import { Split } from "../math/Split";
import { Matrix } from "../math/Matrix";
import { SpriteSheet } from "./SpriteSheet";

export class Sprite
{
	constructor({src, spriteBoard, spriteSet, width, height, x, y, z})
	{
		this[Bindable.Prevent] = true;

		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;

		this.currentAnimation = null;

		this.width  = 32 || width;
		this.height = 32 || height;
		this.scale  = 1;

		this.textures = [];

		this.frames = [];
		this.currentDelay = 0;
		this.currentFrame = 0;
		this.currentFrames = '';

		this.speed    = 0;
		this.maxSpeed = 4;

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

		if(src && !spriteSet)
		{
			spriteSet = new SpriteSheet({image: src});

			console.log(spriteSet);
		}

		this.spriteSet = spriteSet;

		if(spriteSet)
		{
			spriteSet.ready.then(() => {
				console.log(spriteSet);
				this.width = spriteSet.tileWidth;
				this.height = spriteSet.tileHeight;
				this.texture = this.createTexture( spriteSet.getFrame(0) );

				for(let i = 0; i < spriteSet.tileCount; i++)
				{
					this.textures[i] = this.createTexture( spriteSet.getFrame(i) );
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

			if(this.spriteSet && this.spriteSet.animations[this.currentAnimation])
			{
				const animation = this.spriteSet.animations[this.currentAnimation];

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

	changeAnimation(name)
	{
		if(!this.spriteSet ||!this.spriteSet.animations[name])
		{
			console.warn(`Animation ${name} not found.`);
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

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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


		const t = Matrix.transform(points, Matrix.composite(
			Matrix.translate(xOff, yOff)
			// , Matrix.scale(Math.sin(theta), Math.cos(theta))
			// , Matrix.rotate(theta)
			, Matrix.translate(-xOff, -yOff)
		));

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
		gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
	}
}
