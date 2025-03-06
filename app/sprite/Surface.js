import { Bindable } from 'curvature/base/Bindable';
import { Camera } from './Camera';

export class Surface
{
	constructor(spriteBoard, spriteSheet, map, xSize = 2, ySize = 2, xOffset = 0, yOffset = 0, layer = 0, z = -1)
	{
		this[Bindable.Prevent] = true;

		this.spriteBoard = spriteBoard;
		this.spriteSheet = spriteSheet;

		this.x = xOffset;
		this.y = yOffset;
		this.z = z;

		this.layer = layer;
		this.xSize = xSize;
		this.ySize = ySize;

		this.tileWidth  = 32;
		this.tileHeight = 32;

		this.width  = this.xSize * this.tileWidth;
		this.height = this.ySize * this.tileHeight;

		this.map = map;

		this.texVertices = [];

		
		this.subTextures = {};
		
		this.spriteSheet.ready.then(sheet => this.buildTiles());
		
		const gl = this.spriteBoard.gl2d.context;
		this.pane = gl.createTexture();
		
		gl.bindTexture(gl.TEXTURE_2D, this.pane);
		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, this.width
			, this.height
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, null
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		//*/
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		/*/
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		//*/

		this.frameBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER
			, gl.COLOR_ATTACHMENT0
			, gl.TEXTURE_2D
			, this.pane
			, 0
		);
	}

	draw()
	{
		const gl = this.spriteBoard.gl2d.context;

		gl.bindTexture(gl.TEXTURE_2D, this.pane);

		const x = this.x + -Camera.x + (Camera.width  * this.spriteBoard.gl2d.zoomLevel / 2);
		const y = this.y + -Camera.y + (Camera.height  * this.spriteBoard.gl2d.zoomLevel / 2);

		this.setRectangle(
			x
			, y
			, this.width * this.spriteBoard.gl2d.zoomLevel
			, this.height * this.spriteBoard.gl2d.zoomLevel
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	buildTiles()
	{
		let texturePromises = [];
		const size = this.xSize * this.ySize;

		for(let i = 0; i < size; i++)
		{
			let localX  = i % this.xSize;
			let offsetX = Math.floor(this.x / this.tileWidth);
			let globalX = localX + offsetX;

			let localY  = Math.floor(i / this.xSize);
			let offsetY = Math.floor(this.y / this.tileHeight);
			let globalY = localY + offsetY;

			let frames = this.map.getTile(globalX, globalY, this.layer);

			const loadTexture = frame => this.spriteSheet.constructor.loadTexture(this.spriteBoard.gl2d, frame);

			if(Array.isArray(frames))
			{
				let j = 0;
				this.subTextures[i] = [];
				texturePromises.push(
					Promise.all(frames.map((frame)=>
						loadTexture(frame).then(
							args => {
								this.subTextures[i][j] = args.texture;
								j++;
							}
						)
					)
				));
			}
			else
			{
				texturePromises.push(
					loadTexture(frames).then(args => this.subTextures[i] = args.texture)
				);
			}
		}

		Promise.all(texturePromises).then(() => this.assemble());
	}

	assemble()
	{
		const gl = this.spriteBoard.gl2d.context;
		
		gl.bindTexture(gl.TEXTURE_2D, this.subTextures[0][0]);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
		gl.viewport(0, 0, this.width, this.height);
		// gl.clearColor(0, 0, 0, 1);
		gl.clearColor(Math.random(), Math.random(), Math.random(), 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.uniform4f(
			this.spriteBoard.colorLocation
			, 1
			, 0
			, 0
			, 1
		);

		gl.uniform3f(
			this.spriteBoard.tilePosLocation
			, 0
			, 0
			, 0
		);

		gl.uniform2f(
			this.spriteBoard.resolutionLocation
			, this.width
			, this.height
		);

		if(this.subTextures[0][0])
		{
			gl.bindTexture(gl.TEXTURE_2D, this.subTextures[0][0]);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.texCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
				0.0,              0.0,
				this.width / 32,  0.0,
				0.0,              -this.height / 32,
				0.0,              -this.height / 32,
				this.width / 32,  0.0,
				this.width / 32,  -this.height / 32,
			]), gl.STATIC_DRAW);

			this.setRectangle(
				0
				, 0
				, this.width
				, this.height
			);

			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		return;

		for(let i in this.subTextures)
		{
			i = Number(i);
			const x = (i * this.tileWidth) % this.width;
			const y = Math.trunc(i * this.tileWidth / this.width) * this.tileWidth;

			if(!Array.isArray(this.subTextures[i]))
			{
				this.subTextures[i] = [this.subTextures[i]];
			}
			
			for(let j in this.subTextures[i])
			{
				gl.uniform3f(
					this.spriteBoard.tilePosLocation
					, Number(i)
					, Object.keys(this.subTextures).length
					, 1
				);				
				
				gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.texCoordBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
					0.0, 0.0,
					1.0, 0.0,
					0.0, 1.0,
					0.0, 1.0,
					1.0, 0.0,
					1.0, 1.0,
				]), gl.STATIC_DRAW);
				
				this.setRectangle(
					x
					, y + this.tileHeight
					, this.tileWidth
					, -this.tileHeight
				);
				
				gl.drawArrays(gl.TRIANGLES, 0, 6);				
			}
		}

		gl.uniform3f(
			this.spriteBoard.tilePosLocation
			, 0
			, 0
			, 0
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	setRectangle(x, y, width, height)
	{
		const gl = this.spriteBoard.gl2d.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.positionBuffer);

		const x1 = x;
		const x2 = (x + width);
		const y1 = y;
		const y2 = (y + height);

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			x1, y2, this.z,
			x2, y2, this.z,
			x1, y1, this.z,
			x1, y1, this.z,
			x2, y2, this.z,
			x2, y1, this.z,
		]), gl.STATIC_DRAW);
	}
}
