import { Camera } from './Camera';
import { SpriteSheet } from './SpriteSheet';

export  class Background
{
	constructor(spriteBoard, map)
	{
		this.spriteBoard = spriteBoard;
		this.spriteSheet = new SpriteSheet;
		this.map         = map;

		this.width  = 32;
		this.height = 32;

		const gl = this.spriteBoard.gl2d.context;

		this.tileMapping = this.spriteBoard.gl2d.createTexture(1, 1);
		this.tileTexture = this.spriteBoard.gl2d.createTexture(1, 1);
	}

	negSafeMod(a,b)
	{
		if(a >= 0) return a % b;
		return (b + a % b) % b;
	}

	draw()
	{
		const gl = this.spriteBoard.gl2d.context;

		this.spriteBoard.drawProgram.uniformI('u_background', 1);
		this.spriteBoard.drawProgram.uniformF('u_size', this.width + 64, this.height + 64);
		this.spriteBoard.drawProgram.uniformF('u_tileSize', 32, 32);

		const zoom = this.spriteBoard.gl2d.zoomLevel;

		const tilesWide = Math.floor(this.width / 32) + 1;
		const tilesHigh = Math.floor(this.height / 32) + 1;
		const tileCount = tilesWide * tilesHigh;

		const tilesOnScreen = new Uint8Array(4 * tileCount).fill(0).map((_,k) => {
			if(k % 4 === 0) // red channel
			{
				return Math.floor(k / 4) % 256;
			}

			if(k % 4 === 1) // green channel
			{
				return Math.floor(Math.floor(k / 4) / 256);
			}

			return 0;
		});

		gl.bindTexture(gl.TEXTURE_2D, this.tileMapping);
		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, tileCount
			, 1
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, tilesOnScreen
		);

		const xOffset = Math.floor(Math.floor((0.5 * this.width)  / 32) + 1) * 32;
		const yOffset = Math.floor(Math.floor((0.5 * this.height) / 32) - 1) * 32;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			1.0, 0.0,
			0.0, 1.0,
			0.0, 1.0,
			1.0, 0.0,
			1.0, 1.0,
		]), gl.STATIC_DRAW);

		//*/
		this.setRectangle(
			( (this.width / 2) * zoom )
				+ -this.negSafeMod( Camera.x, 32 * zoom )
				+ -xOffset * zoom
			, -(( (this.height / 2) * zoom )
				+ -this.negSafeMod( -Camera.y, 32 * zoom )
				+ -yOffset * zoom)
			, (this.width  + 64) * zoom
			, (this.height + 64) * zoom
		);
		/*/
		this.setRectangle(
			-Camera.x
			, -Camera.y
			, this.width * zoom
			, this.height * zoom
		);
		//*/

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		this.spriteBoard.drawProgram.uniformI('u_background', 0);
	}

	resize(x, y)
	{
		this.width = x;
		this.height = y;
	}

	simulate()
	{}

	setRectangle(x, y, width, height)
	{
		const gl = this.spriteBoard.gl2d.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);

		const x1 = x;
		const x2 = (x + width);
		const y1 = y;
		const y2 = (y + height);

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			x1, y2,
			x2, y2,
			x1, y1,
			x1, y1,
			x2, y2,
			x2, y1,
		]), gl.STATIC_DRAW);
	}
}
