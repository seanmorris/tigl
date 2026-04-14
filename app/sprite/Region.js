import { Bindable } from "curvature/base/Bindable";
import { SpriteSheet } from "./SpriteSheet";
import { Matrix } from "../math/Matrix";
import { Camera } from "./Camera";
import { Rectangle } from "../math/Rectangle";

/**
 * @import { Session } from "../session/Session";
 * @import { SpriteBoard } from "./SpriteBoard";
 */

const rectMap = new WeakMap;

/**
 * Represents a Region of a TileMap
 */
export class Region
{
	/**
	 * Given a Rectangle, return a registered Region
	 * @param {Rectangle} rect - The Rectangle associated with a Region
	 * @returns {Region|undefined} - The Region registered to the Rectangle or undefined if not registered
	 */
	static fromRect(rect)
	{
		return rectMap.get(rect);
	}

	/**
	 * Construct a Region object
	 * @param {object} param0 - Named params
	 * @param {number} param0.x - The x value of the top/left of the Region
	 * @param {number} param0.y - The y value of the top/left of the Region
	 * @param {number} param0.z - The z value of the Region (render order)
	 * @param {number} param0.width - The width of the Region
	 * @param {number} param0.height - The height of the Region
	 * @param {Session} param0.session - The current Session
	 * @param {SpriteBoard} param0.spriteBoard - The height of the Region
	 */
	constructor({x, y, z, width, height, session, spriteBoard})
	{
		this[Bindable.Prevent] = true;

		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;

		this.width  = width  || 32;
		this.height = height || 32;

		this.originalWidth = width;
		this.originalHeight = height;

		this.visible = false;

		this.gravity = 0.5;
		this.drag = 0.95;

		this.rect = new Rectangle(
			this.x
			, this.y
			, this.x + this.width
			, this.y + this.height
		);

		this.bounds = new Rectangle(
			this.x
			, this.y
			, this.x + this.width
			, this.y + this.height
		);

		rectMap.set(this.rect, this);

		this.spriteBoard = spriteBoard;
		this.session = session;
		this.region = [0, 1, 1, 1];

		const gl = this.spriteBoard.gl2d.context;

		this.texture = gl.createTexture();

		const singlePixel = new Uint8ClampedArray([
			this.region[0] * 255
			, this.region[1] * 255
			, this.region[2] * 255
			, this.region[3] * 255
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
	}

	/**
	 * Move the Region object
	 * @param {number} x - The x value to shift by
	 * @param {number} y - The y value to shift by
	 */
	move(x, y)
	{
		this.x += x;
		this.y += y;

		this.rect.x1 += x;
		this.rect.x2 += x;
		this.rect.y1 += y;
		this.rect.y2 += y;

		this.bounds.x1 += x;
		this.bounds.x2 += x;
		this.bounds.y1 += y;
		this.bounds.y2 += y;
	}

	/**
	 * Resize the Region
	 * @param {number} w - The new width
	 * @param {number} h - The new height
	 * @param {number} cx - The x value to shift by
	 * @param {number} cy - The y value to shift by
	 */
	resize(w, h, cx, cy)
	{
		const wStart = this.width;
		const hStart = this.height;

		const rwStart = this.rect.x2 - this.rect.x1;
		const rhStart = this.rect.y2 - this.rect.y1;

		const sx = cx * (1 - w/wStart) * wStart;
		const sy = cy * (1 - h/hStart) * hStart;

		this.width = w;
		this.height = h;

		this.x += sx;
		this.y += sy;

		if(rwStart < w)
		{
			this.rect.x1 = this.x;
			this.rect.x2 = this.rect.x1 + w;
		}

		if(rhStart < h)
		{
			this.rect.y1 = this.y;
			this.rect.y2 = this.rect.y1 + h;
		}

		this.bounds.x1 = this.x;
		this.bounds.x2 = this.x + w;
		this.bounds.y1 = this.y;
		this.bounds.y2 = this.y + h;
	}

	/**
	 * Tick the Region's simulation logic
	 * @param {number} delta - Number of ms since last tick
	 */
	simulate(delta)
	{
		this.resize(
			this.width
			, this.originalHeight * ((Math.sin(this.session.world.age / 3000) * 0.5) + 0.5)
			, 1.0
			, 1.0
		);
	}

	/**
	 * Render the Region
	 * @param {number} delta - Number of ms since last render
	 */
	draw(delta)
	{
		const gl = this.spriteBoard.gl2d.context;
		const zoom = this.spriteBoard.zoomLevel;
		this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		this.setRectangle(
			this.x * zoom + -Camera.x + (this.spriteBoard.width / 2)
			, this.y * zoom + -Camera.y + (this.spriteBoard.height / 2)
			, this.width * zoom
			, this.height * zoom
		);

		// gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
		// gl.drawArrays(gl.TRIANGLES, 0, 6);

		this.spriteBoard.drawProgram.uniformF('u_region', ...Object.assign(this.region || [0, 0, 0], {3: 1}));

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.effectBuffer);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

		// Cleanup...
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
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
		const zoom = this.spriteBoard.zoomLevel;

		const xra = 1.0;
		const yra = 1.0;

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

		const xOff = x + width;
		const yOff = y + height;

		const t = Matrix.transform(points, Matrix.composite(
			Matrix.translate(xOff + -width * 0.0, yOff)
			, Matrix.translate(-xOff, -yOff)
		));

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
		gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);
	}
}
