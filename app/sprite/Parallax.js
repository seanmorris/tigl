import { Bindable } from 'curvature/base/Bindable';

class ParallaxLayer
{
	texture = null;
	width = 0;
	height = 0;
	offset = 0;
	parallax = 0;
}

export class Parallax
{
	constructor({spriteBoard, map})
	{
		this[Bindable.Prevent] = true;
		this.spriteBoard = spriteBoard;

		const gl = this.spriteBoard.gl2d.context;

		this.map = map;
		this.texture = null;

		this.height = 0;

		this.slices = [
			'parallax/mountains-0.png'
			, 'parallax/sky-0-recolor.png'
			, 'parallax/sky-1-recolor.png'
			, 'parallax/sky-1b-recolor.png'
			, 'parallax/sky-2-recolor.png'
		];

		this.parallaxLayers = [];
		this.textures = [];

		this.ready = map.ready.then(() => this.assemble(map)).then(() => {
			this.loaded = true;
		});

		this.loaded = false;

		this.x = 0;
		this.y = 0;
	}

	assemble()
	{
		const gl = this.spriteBoard.gl2d.context;

		const loadSlices = this.map.imageLayers.map(
			(layerData, index) => this.constructor.loadImage(layerData.image).then(image => {
				const texture = this.textures[index] = gl.createTexture();
				const layer = this.parallaxLayers[index] = new ParallaxLayer;

				const layerBottom = image.height + layerData.offsety;

				if(this.height < layerBottom)
				{
					this.height = layerBottom;
				}

				layer.texture = texture;
				layer.width = image.width;
				layer.height = image.height;
				layer.offset = layerData.offsety ?? 0;
				layer.parallax = layerData.parallaxx ?? 1;

				gl.bindTexture(gl.TEXTURE_2D, texture);

				gl.texImage2D(
					gl.TEXTURE_2D
					, 0
					, gl.RGBA
					, gl.RGBA
					, gl.UNSIGNED_BYTE
					, image
				);

				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			}
		));

		return Promise.all(loadSlices);
	}

	draw()
	{
		if(!this.loaded)
		{
			return;
		}

		const gl = this.spriteBoard.gl2d.context;
		const zoom = this.spriteBoard.zoomLevel;

		this.x = this.spriteBoard.following.sprite.x + -this.spriteBoard.width / zoom * 0.5;
		this.y = this.spriteBoard.following.sprite.y;

		this.spriteBoard.drawProgram.uniformI('u_renderParallax', 1);
		this.spriteBoard.drawProgram.uniformF('u_scroll', this.x, this.y);

		gl.activeTexture(gl.TEXTURE0);

		for(const layer of this.parallaxLayers)
		{
			gl.bindTexture(gl.TEXTURE_2D, layer.texture);

			this.spriteBoard.drawProgram.uniformF('u_size', layer.width, layer.width);
			this.spriteBoard.drawProgram.uniformF('u_parallax', layer.parallax, 0);

			this.setRectangle(
				0
				, this.spriteBoard.height + (-this.height + layer.offset) * zoom
				, layer.width * zoom
				, layer.height * zoom
				, layer.width
			);

			gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}

		this.spriteBoard.drawProgram.uniformI('u_renderParallax', 0);

		// Cleanup...
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	static loadImage(src)
	{
		if(!this.imagePromises)
		{
			this.imagePromises = {};
		}

		if(this.imagePromises[src])
		{
			return this.imagePromises[src];
		}

		this.imagePromises[src] = new Promise((accept, reject)=>{
			const image = new Image();
			image.src   = src;
			image.addEventListener('load', (event)=>{
				accept(image);
			});
		});

		return this.imagePromises[src];
	}

	setRectangle(x, y, width, height)
	{
		const gl = this.spriteBoard.gl2d.context;
		const ratio = this.spriteBoard.width / width;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_texCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			ratio, 0.0,
			0.0, 1.0,
			0.0, 1.0,
			ratio, 0.0,
			ratio, 1.0,
		]), gl.STATIC_DRAW);

		const x1 = x - 0;
		const x2 = x + this.spriteBoard.width;
		const y1 = y;
		const y2 = y + height;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBoard.drawProgram.buffers.a_position);
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
