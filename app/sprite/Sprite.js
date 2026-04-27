import { Bindable } from "curvature/base/Bindable";
import { SpriteSheet } from "./SpriteSheet";
import { Matrix } from "../math/Matrix";
import { Camera } from "./Camera";

/**
 * @import { Session } from "../session/Session";
 */

/**
 * @typedef {Uint8Array|Uint8ClampedArray|number[]} ColorBytes
 */

/**
 * Renders a bitmap from an image or spritesheet.
 * @property {number} x - The x position
 * @property {number} y - The y position
 * @property {number} z - The z position (render order)
 * @property {string|null} currentAnimation - The currently running animation
 * @property {number} width - The on-screen width
 * @property {number} height - The on-screen height
 * @property {number} originalWidth - The original width of the sprite (used for tiling)
 * @property {number} originalHeight - The original height of the sprite (used for tiling)
 * @property {boolean} tiled - Whether the sprite is tiled
 * @property {number} scale - The scale multiplier of the sprite
 * @property {number} scaleX - The X scale multiplier of the sprite
 * @property {number} scaleY - The Y scale multiplier of the sprite
 * @property {number} theta - The rotation of the sprite in radians
 * @property {number} shearX - The X shear factor
 * @property {number} shearY - The Y shear factor
 * @property {number} shearX2 - A second X shear factor, applied AFTER y-shearing.
 * @property {number} repeatX - Repeat cound in the X direction
 * @property {number} repeatY - Repeat cound in the Y direction
 * @property {number} xCenter - Repeat cound in the X direction
 * @property {number} yCenter - Repeat cound in the Y direction
 * @property {boolean} visible - Whether the sprite is currently visible
 * @property {Array} textures - List of textures keyed by ID loaded from a Spritesheet
 * @property {number} currentDelay - Delay until next frame
 * @property {number} currentFrame - Currently displayed frame
 * @property {object} spriteBoard - The spriteboard the sprite is attached to
 * @property {object} texture - The base texture for the sprite
 */
export class Sprite
{
	/**
	 * Construct a Sprite object
	 * @param {object} param0 - Named params
	 * @param {Session} param0.session - Session associated with the sprite
	 * @param {string|URL} [param0.src] - Image URL to generate a Sprite
	 * @param {ColorBytes} [param0.color] - Color to use if no image is provided
	 * @param {string} [param0.pixels] - NOT USED
	 * @param {SpriteSheet} [param0.spriteSheet] - SpriteSheet used to render the sprite
	 * @param {number} [param0.x] - The x position
	 * @param {number} [param0.y] - The y position
	 * @param {number} [param0.z] - The z position (render order)
	 * @param {number} [param0.width] - The on-screen width
	 * @param {number} [param0.height] - The on-screen height
	 * @param {number} [param0.originalWidth] - The original width of the sprite (used for tiling)
	 * @param {number} [param0.originalHeight] - The original height of the sprite (used for tiling)
	 * @param {boolean} [param0.tiled] - Whether to tile the sprite
	 */
	constructor({src, color, pixels, session, spriteSheet, x, y, z, width, height, originalWidth, originalHeight, tiled = false})
	{
		// this[Bindable.Prevent] = true;

		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;

		/** @type {string} */
		this.currentAnimation = '';

		this.width  = width  || 32;
		this.height = height || 32;

		this.originalWidth = originalWidth ?? this.width;
		this.originalHeight = originalHeight ?? this.height;
		this.tiled = tiled;

		this.scale   = 1;
		this.scaleX  = 1;
		this.scaleY  = 1;
		this.theta   = 0; //Math.PI;
		this.shearX  = 0;
		this.shearY  = 0;
		this.shearX2 = 0;
		this.repeatX = 1;
		this.repeatY = 1;

		this.xCenter = 0.5;
		this.yCenter = 1.0;

		this.visible = false;

		/** @type {WebGLTexture[]} */
		this.textures = [];
		this.currentDelay = 0;
		this.currentFrame = 0;

		// this.RIGHT	= 0;
		// this.DOWN	= 1;
		// this.LEFT	= 2;
		// this.UP		= 3;

		// this.EAST	= this.RIGHT;
		// this.SOUTH	= this.DOWN;
		// this.WEST	= this.LEFT;
		// this.NORTH	= this.UP;

		// this.region = [0, 0, 0, 1];
		// this.tint = [255, 0, 0, 255];

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

				const firstFrame = spriteSheet.getFrame(0);

				if(firstFrame) this.texture = this.createTexture( firstFrame );

				for(let i = 0; i < spriteSheet.tileCount; i++)
				{
					const frame = spriteSheet.getFrame(i);
					if(frame) this.textures[i] = this.createTexture(frame);
				}

				this.changeAnimation('default');
			});
		}

		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	/**
	 * Draw the sprite
	 * @param {number} delta - MS since last tick
	 */
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
			this.x * zoom + -Camera.x + (this.spriteBoard.width * 0.5)
			, this.y * zoom + -Camera.y + (this.spriteBoard.height * 0.5) + -this.height * zoom
			, this.width * zoom
			, this.height * zoom
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		// this.spriteBoard.drawProgram.uniformF('u_region', ...Object.assign(this.region || [0, 0, 0], {3: 1}));

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.effectBuffer);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

		// Cleanup...
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	/**
	 * Change the current animation.
	 * @param {string} name - The animation to swtich to
	 */
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
			this.currentFrame = -1;
		}
	}

	/**
	 * Create a new texture given an array of pixel values
	 * @param {Uint8Array|Uint8ClampedArray} pixels - The pixels to use for the texture
	 * @returns {WebGLTexture} - The texture
	 */
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

	/**
	 * Set the rectangle in the viewport for rendering
	 * @param {number} x - The x value of the top/left of the render window
	 * @param {number} y - The y value of the top/left of the render window
	 * @param {number} width - The width of the render window
	 * @param {number} height - The height of the render window
	 */
	setRectangle(x, y, width, height)
	{
		const gl = this.spriteBoard.gl2d.context;
		const xra = (this.width / this.originalWidth) * this.repeatX;
		const yra = (this.height / this.originalHeight) * this.repeatY;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			xra, 0.0,
			0.0, yra,
			0.0, yra,
			xra, 0.0,
			xra, yra,
		]), gl.STATIC_DRAW);

		// const zoom = this.spriteBoard.zoomLevel;

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
			Matrix.translate(xOff + -width * 0.5, yOff)
			, Matrix.rotate(this.theta)
			, Matrix.scale(this.scale * this.scaleX, this.scale * this.scaleY)
			, Matrix.shearX(this.shearX2)
			, Matrix.shearY(this.shearY)
			, Matrix.shearX(this.shearX)
			, Matrix.translate(-xOff, -yOff)
		));

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
		gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
	}
}
