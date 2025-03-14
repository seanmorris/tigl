import { Camera } from './Camera';
import { SpriteSheet } from './SpriteSheet';

export  class Background
{
	constructor(spriteBoard, map)
	{
		this.spriteBoard = spriteBoard;
		this.spriteSheet = new SpriteSheet;
		this.map = map;

		this.width  = 32;
		this.height = 32;

		const gl = this.spriteBoard.gl2d.context;

		this.tileMapping = this.spriteBoard.gl2d.createTexture(1, 1);
		this.tileTexture = this.spriteBoard.gl2d.createTexture(1, 1);

		const r = () => parseInt(Math.random() * 255);
		const pixel = new Uint8Array([r(), r(), r(), 255]);

		map.ready.then(() => {
			gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
			gl.texImage2D(
				gl.TEXTURE_2D
				, 0
				, gl.RGBA
				, map.tileSetWidth
				, map.tileSetHeight
				, 0
				, gl.RGBA
				, gl.UNSIGNED_BYTE
				, map.pixels
			);
		});
	}

	negSafeMod(a,b)
	{
		if(a >= 0) return a % b;
		return (b + a % b) % b;
	}

	draw()
	{
		const gl = this.spriteBoard.gl2d.context;

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);

		this.spriteBoard.drawProgram.uniformI('u_background', 1);
		this.spriteBoard.drawProgram.uniformF('u_size', this.width, this.height);
		this.spriteBoard.drawProgram.uniformF('u_tileSize', 32, 32);
		this.spriteBoard.drawProgram.uniformF('u_mapTextureSize', this.map.tileSetWidth, this.map.tileSetHeight);

		const zoom = this.spriteBoard.gl2d.zoomLevel;

		const tilesWide = Math.floor(this.width / 32);
		const tilesHigh = Math.floor(this.height / 32);
		const tileCount = tilesWide * tilesHigh;

		const tilesOnScreen = new Uint8Array(4 * tileCount).fill(0).map((_,k) => {
			if(k % 4 === 0) // red channel
			{
				return Math.floor(k/4) % 2 ? 1 : 0;
			}

			if(k % 4 === 1) // green channel
			{}

			return 0;
		});

		this.spriteBoard.drawProgram.uniformF('u_tileCount', tileCount);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.tileMapping);
		this.spriteBoard.drawProgram.uniformI('u_tileMapping', 2);

		// Put the effectLayer in tex1
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
		this.spriteBoard.drawProgram.uniformI('u_tiles', 3);

		gl.activeTexture(gl.TEXTURE0);

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
		const yOffset = Math.floor(Math.floor((0.5 * this.height) / 32) - 0) * 32;

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
				+ -32 * zoom
			, -(( ((this.height + 32) / 2) * zoom )
				+ -this.negSafeMod( -Camera.y, 32 * zoom )
				+ -yOffset * zoom
				+ 16 * zoom
			)
			, this.width * zoom
			, this.height * zoom
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
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	resize(x, y)
	{
		this.width =  x + 128;
		this.height = y + 128;
		// this.width =  Math.ceil(x / 32) * 32;
		// this.height = Math.ceil(y / 32) * 32;
	}

	simulate()
	{}

	setRectangle(x, y, width, height)
	{
		const gl = this.spriteBoard.gl2d.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);

		const x1 = x;
		const x2 = x + width;
		const y1 = y;
		const y2 = y + height;

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
