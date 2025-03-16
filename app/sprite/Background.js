import { Bindable } from 'curvature/base/Bindable';
import { SpriteSheet } from './SpriteSheet';

export  class Background
{
	constructor(spriteBoard, map)
	{
		this[Bindable.Prevent] = true;
		this.spriteBoard = spriteBoard;
		this.spriteSheet = new SpriteSheet;

		this.loaded = false;

		this.map = map;
		this.width  = 0;
		this.height = 0;

		this.tileWidth  = 0;
		this.tileHeight = 0;

		this.xOffset = 0;
		this.yOffset = 0;

		const gl = this.spriteBoard.gl2d.context;

		this.tileMapping = this.spriteBoard.gl2d.createTexture(1, 1);
		this.tileTexture = this.spriteBoard.gl2d.createTexture(1, 1);

		const r = () => parseInt(Math.random() * 0xFF);
		const pixel = new Uint8Array([r(), r(), r(), 0xFF]);

		map.ready.then(() => {
			this.loaded = true;
			this.tileWidth  = map.tileWidth;
			this.tileHeight = map.tileHeight;
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
		if(!this.loaded)
		{
			return;
		}

		const gl = this.spriteBoard.gl2d.context;

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);

		this.spriteBoard.drawProgram.uniformI('u_background', 1);
		this.spriteBoard.drawProgram.uniformF('u_size', this.width, this.height);
		this.spriteBoard.drawProgram.uniformF('u_tileSize', this.tileWidth, this.tileHeight);
		this.spriteBoard.drawProgram.uniformF('u_mapTextureSize', this.map.tileSetWidth, this.map.tileSetHeight);

		const xOffset = Math.floor(Math.floor((0.5 * this.width)  / 64) + 0) * 64;
		const yOffset = Math.floor(Math.floor((0.5 * this.height) / 64) + 0) * 64;

		const zoom = this.spriteBoard.gl2d.zoomLevel;

		const x = this.spriteBoard.following.sprite.x;
		const y = this.spriteBoard.following.sprite.y;

		const halfTileWidth  = this.tileWidth  * 0.5;
		const halfTileHeight = this.tileHeight * 0.5;

		const xPos = ( this.width * zoom * 0.5 )
			+ -this.negSafeMod( x + halfTileWidth, 64 ) * zoom
			+ -xOffset * zoom
			+ this.xOffset * zoom * 0.5;

		const yPos = ( this.height * zoom * 0.5 )
			+ -this.negSafeMod( y + halfTileHeight, 64 ) * zoom
			+ -yOffset * zoom
			+ this.yOffset * zoom * 0.5;

		const tilesWide = Math.floor(this.width / this.tileWidth);
		const tilesHigh = Math.floor(this.height / this.tileHeight);
		const tileCount = tilesWide * tilesHigh;

		const tilePixels = this.map.getSlice(
			(x+halfTileWidth)/this.tileWidth
				+ -this.negSafeMod( x + halfTileWidth, 64 ) / this.tileWidth
				+ -xOffset / this.tileWidth
			, (y+halfTileHeight)/this.tileHeight
				+ -this.negSafeMod( y + halfTileHeight, 64 ) / this.tileHeight
				+ -yOffset / this.tileHeight
			, tilesWide
			, tilesHigh
		);

		this.spriteBoard.drawProgram.uniformF('u_tileCount', tileCount);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.tileMapping);
		this.spriteBoard.drawProgram.uniformI('u_tileMapping', 2);

		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
		this.spriteBoard.drawProgram.uniformI('u_tiles', 3);

		gl.activeTexture(gl.TEXTURE0);

		gl.bindTexture(gl.TEXTURE_2D, this.tileMapping);
		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, tilesWide
			, tilesHigh
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, tilePixels
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			1.0, 0.0,
			0.0, 1.0,
			0.0, 1.0,
			1.0, 0.0,
			1.0, 1.0,
		]), gl.STATIC_DRAW);

		this.setRectangle(
			xPos + this.tileWidth * 0.5 * zoom
			, yPos + this.tileHeight * zoom
			, this.width * zoom
			, this.height * zoom
		);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		this.spriteBoard.drawProgram.uniformI('u_background', 0);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	resize(x, y)
	{
		this.width =  x + 0;
		this.height = y + 0;

		this.width =  Math.ceil(x / 128) * 128 + 128;
		this.height = Math.ceil(y / 128) * 128 + 128;

		this.xOffset = x - this.width;
		this.yOffset = y - this.height;
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
