import { Bindable } from "curvature/base/Bindable";
import { Camera } from "./Camera";

export class Line
{
	constructor({ x1, y1, x2, y2, z, color, session, })
	{
		this[Bindable.Prevent] = true;

		this.x1 = x1 || 0;
		this.y1 = y1 || 0;

		this.x2 = x2 || 0;
		this.y2 = y2 || 0;

		this.z = z || 0;

		this.spriteBoard = session.spriteBoard;

		const gl = this.spriteBoard.gl2d.context;

		const singlePixel = color
			? new Uint8Array(color)
			: new Uint8Array([
				Math.trunc(Math.random() * 255)
				, Math.trunc(Math.random() * 255)
				, Math.trunc(Math.random() * 255)
				, 255
			]);

		this.texture = gl.createTexture();

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

	draw(delta)
	{
		const gl = this.spriteBoard.gl2d.context;
		const zoom = this.spriteBoard.zoomLevel;

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		const x1 = this.x1 * zoom + -Camera.x + (this.spriteBoard.width / 2);
		const y1 = this.y1 * zoom + -Camera.y + (this.spriteBoard.height / 2) + -this.height * zoom;

		const x2 = this.x2 * zoom + -Camera.x + (this.spriteBoard.width / 2);
		const y2 = this.y2 * zoom + -Camera.y + (this.spriteBoard.height / 2) + -this.height * zoom;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([

			0.0, 0.0,
			1.0, 0.0,
			0.0, 1.0,

			0.0, 1.0,
			1.0, 0.0,
			1.0, 1.0,

		]), gl.STATIC_DRAW);

		const points = new Float32Array([
			x1, y1,
			x2, y1,
			x1, y2,
			x1, y2,
			x2, y1,
			x2, y2,
		]);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
		gl.bufferData(gl.ARRAY_BUFFER, t, gl.STATIC_DRAW);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		this.spriteBoard.drawProgram.uniformF('u_region', ...Object.assign(this.region || [0, 0, 0], { 3: 1 }));

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.effectBuffer);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		this.spriteBoard.drawProgram.uniformF('u_region', 0, 0, 0, 0);

		// Cleanup...
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
}
