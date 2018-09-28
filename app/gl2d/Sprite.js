export class Sprite
{
	constructor(gl2d, imageSrc)
	{
		this.gl2d   = gl2d;

		this.x      = 0;
		this.y      = 0;

		this.width  = 32;
		this.height = 48;

		const gl = gl2d.context;

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
			, new Uint8Array([255, 0, 0, 255])
		);

		const image = new Image();

		image.onload = () => {

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
				, image
			);
		};

		// image.src = '/noodles-03.jpg';
		image.src = imageSrc;
	}

	draw()
	{
		const gl = this.gl2d.context;

		gl.useProgram(this.gl2d.program);

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

		this.setRectangle(
			this.x
			, this.y
			, this.width
			, this.height
		);

		gl.uniform4f(
			this.gl2d.colorLocation
			, 1
			, 0
			, 0
			, 1
		);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	loadImage(src)
	{
		return new Promise((accept, reject)=>{
			const image = new Image();
			image.src   = src;
			image.addEventListener('load', (event)=>{
				accept(image);
			});
		});
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
		]), gl.STATIC_DRAW);
	}

	randomInt(range) {
		return Math.floor(Math.random() * range);
	}
}
