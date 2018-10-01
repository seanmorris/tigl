export class Surface
{
	constructor(gl2d, spriteSheet)
	{
		this.gl2d    = gl2d;
		this.x       = 0;
		this.y       = 0;

		this.width   = 60*32;
		this.height  = 34*32;

		this.tileWidth  = 32;
		this.tileHeight = 32;

		this.spriteSheet = spriteSheet;

		this.texVertices = [];

		const gl     = gl2d.context;

		this.texture = gl.createTexture();

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

		this.spriteSheet.ready.then((sheet)=>{
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

			for(let i = 0; i < 60*34; i++)
			{
				this.texVertices.push(this.spriteSheet.getVertices('floorTile.png'));
			}

			// this.texVertices.push(this.spriteSheet.getVertices('alien_plant_1.png'));
			// this.texVertices.push(this.spriteSheet.getVertices('alien_plant_2.png'));
		});

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

		gl.uniform2f(
			this.gl2d.resolutionLocation
			, gl.canvas.width
			, gl.canvas.height
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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0,  0.0,
			1.0,  0.0,
			0.0,  1.0,
			0.0,  1.0,
			1.0,  0.0,
			1.0,  1.0,
		]), gl.STREAM_DRAW);

		let x = 0;
		let y = 0;

		if(this.texVertices)
		{
			for(let i in this.texVertices)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);

				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
					this.texVertices[i].u1,  this.texVertices[i].v1,
					this.texVertices[i].u2,  this.texVertices[i].v1,
					this.texVertices[i].u1,  this.texVertices[i].v2,

					this.texVertices[i].u1,  this.texVertices[i].v2,
					this.texVertices[i].u2,  this.texVertices[i].v1,
					this.texVertices[i].u2,  this.texVertices[i].v2,
					
				]), gl.STREAM_DRAW);

				this.setRectangle(
					this.x   - (
						(this.gl2d.camera.x - parseInt(this.gl2d.camera.width  /2))
						- x
					)
					, this.y - (
						(this.gl2d.camera.y - parseInt(this.gl2d.camera.height /2))
						- y
					)
					, this.tileWidth
					, this.tileHeight
				);

				x += this.tileWidth;

				if(x >= this.width)
				{
					x = 0;
					y += this.tileHeight;
				}

				gl.drawArrays(gl.TRIANGLES, 0, 6);
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
			x1, y1,
			x2, y1,
			x1, y2,
			x1, y2,
			x2, y1,
			x2, y2,
		]), gl.STREAM_DRAW);
	}
}
