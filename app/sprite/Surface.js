export class Surface
{
	constructor(gl2d, map, xSize = 2, ySize = 2, xOffset = 0, yOffset = 0)
	{
		this.gl2d    = gl2d;
		this.x       = xOffset;
		this.y       = yOffset;

		this.xSize   = xSize;
		this.ySize   = ySize;

		this.tileWidth  = 32;
		this.tileHeight = 32;

		this.width   = this.xSize * this.tileWidth;
		this.height  = this.ySize * this.tileHeight;

		this.map = map;

		this.texVertices = [];

		const gl     = gl2d.context;

		this.texture     = gl.createTexture();
		this.subTextures = {};

		this.loaded = false;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		const r = ()=>parseInt(Math.random()*255);

		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, 1
			, 1
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, new Uint8Array([r(), r(), 0, 255])
		);

		this.map.spriteSheet.ready.then((sheet)=>{
			gl.bindTexture(gl.TEXTURE_2D, this.texture);

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
				, sheet.image
			);

			let texturePromises = [];

			for(let i = 0; i < this.xSize*this.ySize; i++)
			{
				let vertices;

				let localX  = i % this.xSize;
				let offsetX = Math.floor(this.x / this.tileWidth);
				let globalX = localX + offsetX;

				let localY  = Math.floor(i / this.xSize);
				let offsetY = Math.floor(this.y / this.tileHeight);
				let globalY = localY + offsetY;

				let frames = this.map.getTile(globalX, globalY);

				if(Array.isArray(frames))
				{
					let j = 0;
					this.subTextures[i] = [];
					texturePromises.push(
						Promise.all(frames.map((frame)=>
							this.map.spriteSheet.constructor.loadTexture(gl2d, frame).then(
								(args)=>{
									j++;
									this.subTextures[i][j] = args.texture;

									return Promise.resolve();
								}
							)
						))
					);
				}
				else
				{
					texturePromises.push(
						this.map.spriteSheet.constructor.loadTexture(gl2d, frames).then(
							(args)=>{
								this.subTextures[i] = args.texture;

								return Promise.resolve();
							}
						)
					);
				}

			}

			Promise.all(texturePromises).then(()=>{
				this.assemble();

				this.loaded = true;
			});

		});

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

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		this.frameBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

		const attachmentPoint = gl.COLOR_ATTACHMENT0;

		gl.framebufferTexture2D(
			gl.FRAMEBUFFER
			, attachmentPoint
			, gl.TEXTURE_2D
			, this.pane
			, 0
		);
	}

	draw()
	{
		const gl = this.gl2d.context;

		gl.useProgram(this.gl2d.program);

		gl.uniform4f(
			this.gl2d.colorLocation
			, 1
			, 0
			, 0
			, 1
		);

		gl.enableVertexAttribArray(this.gl2d.positionLocation);

		gl.bindTexture(gl.TEXTURE_2D, this.pane);
		gl.enableVertexAttribArray(this.gl2d.texCoordLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);

		gl.vertexAttribPointer(
			this.gl2d.texCoordLocation
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0,  0.0,
			1.0,  0.0,
			0.0,  1.0,
			0.0,  1.0,
			1.0,  0.0,
			1.0,  1.0,
		]), gl.STATIC_DRAW);

		this.setRectangle(
			this.x   - (this.gl2d.camera.x - parseInt(this.gl2d.camera.width  /2))
			, this.y - (this.gl2d.camera.y - parseInt(this.gl2d.camera.height /2))
			, this.width
			, this.height
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	assemble()
	{
		const gl = this.gl2d.context;

		gl.useProgram(this.gl2d.program);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

		gl.viewport(0, 0, this.width, this.height);

		gl.clearColor(0, 0, 1, 1);   // clear to blue
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.uniform4f(
			this.gl2d.colorLocation
			, 1
			, 0
			, 0
			, 1
		);

		gl.enableVertexAttribArray(this.gl2d.positionLocation);

		gl.uniform2f(
			this.gl2d.resolutionLocation
			, this.width
			, this.height
		);

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.enableVertexAttribArray(this.gl2d.texCoordLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);

		gl.vertexAttribPointer(
			this.gl2d.texCoordLocation
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		let x = 0;
		let y = 0;

		for(let i in this.subTextures)
		{
			if(!Array.isArray(this.subTextures[i]))
			{
				this.subTextures[i] = [this.subTextures[i]];
			}

			for(let j in this.subTextures[i])
			{
				gl.bindTexture(gl.TEXTURE_2D, this.subTextures[i][j]);
				// gl.enableVertexAttribArray(this.gl2d.texCoordLocation);
				gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);

				gl.vertexAttribPointer(
					this.gl2d.texCoordLocation
					, 2
					, gl.FLOAT
					, false
					, 0
					, 0
				);

				gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
					0.0,  1.0,
					1.0,  1.0,
					0.0,  0.0,
					0.0,  0.0,
					1.0,  1.0,
					1.0,  0.0,
				]), gl.STREAM_DRAW);

				this.setRectangle(
					x
					, y
					, this.tileWidth
					, this.tileHeight
				);

				gl.drawArrays(gl.TRIANGLES, 0, 6);
			}
			x += this.tileWidth;

			if(x >= this.width)
			{
				x = 0;
				y += this.tileHeight;
			}
		}
	}

	setRectangle(x, y, width, height)
	{
		const gl = this.gl2d.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.positionBuffer);

		gl.vertexAttribPointer(
			this.gl2d.positionLocation
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		var x1 = x;
		var x2 = x + width;
		var y1 = y;
		var y2 = y + height;
		
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
