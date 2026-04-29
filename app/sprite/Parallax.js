import { Bindable } from 'curvature/base/Bindable';

/**
 * @import { Properties } from '../world/Properties';
 * @import { SpriteBoard } from './SpriteBoard';
 * @import { TileMap } from '../world/TileMap';
 */

/**
 * Represents one layer of a Parallax
 */
class ParallaxLayer
{
	/**
	 * @type {WebGLTexture|null} texture - The texture of the layer
	 */
	texture = null;

	/**
	 * @type {number} width - The width of the layer
	 */
	width = 0;

	/**
	 * @type {number} height - The width of the layer
	 */
	height = 0;

	/**
	 * @type {number} offset - The offset of the layer
	 */
	offset = 0;

	/**
	 * @type {number} parallax - The parallax factor of the layer
	 */
	parallax = 0;

	/**
	 * @type {Properties|null} properties - The properties of the layer
	 */
	props = null;
}

/**
 * Represents Parallax background
 */
export class Parallax
{
	/**
	 * Construct a Parallax object
	 * @param {object} param0 - Named params
	 * @param {SpriteBoard} param0.spriteBoard - The SpriteBoard to render to
	 * @param {TileMap} param0.map -The TileMap that owns the Parallax
	 */
	constructor({spriteBoard, map})
	{
		// this[Bindable.Prevent] = true;
		this.spriteBoard = spriteBoard;

		const gl = this.spriteBoard.gl2d.context;

		this.map = map;
		this.texture = null;

		this.height = 0;

		/** @type {Array<ParallaxLayer>} */
		this.parallaxLayers = [];

		/** @type {Array<WebGLTexture>} */
		this.textures = [];

		this.ready = map.ready.then(() => this.assemble()).then(() => {
			this.loaded = true;
		});

		this.loaded = false;

		this.x = 0;
		this.y = 0;
	}

	/**
	 * Get the Parallax ready to use
	 * @returns {Promise<Array<void>>} - Resolves when the Parallax is ready
	 */
	assemble()
	{
		const gl = this.spriteBoard.gl2d.context;

		/** @type { typeof Parallax } */
		this.constructor;

		const loadSlices = this.map.imageLayers.map(
			(layerData, index) => this.constructor.loadImage(new URL(layerData.image, this.map.src)).then(image => {
				const texture = this.textures[index] = gl.createTexture();
				const layer = this.parallaxLayers[index] = new ParallaxLayer;

				const layerBottom = image.height + (layerData.offsety ?? 0);

				if(this.height < layerBottom)
				{
					this.height = layerBottom;
				}

				layer.texture = texture;
				layer.width = image.width;
				layer.height = image.height;
				layer.offset = layerData.offsety ?? 0;
				layer.parallax = layerData.parallaxx ?? 1;
				layer.props = layerData.props;

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
			})
		);

		return Promise.all(loadSlices);
	}

	/**
	 * Draw the Parallax
	 */
	draw()
	{
		if(!this.loaded)
		{
			return;
		}

		const gl = this.spriteBoard.gl2d.context;
		const zoom = this.spriteBoard.zoomLevel;

		this.x = this.spriteBoard.following.x + -this.spriteBoard.width / zoom * 0.5;
		this.y = this.spriteBoard.following.y;

		this.spriteBoard.drawProgram.uniformI('u_renderParallax', 1);
		this.spriteBoard.drawProgram.uniformF('u_scroll', this.x, this.y);

		gl.activeTexture(gl.TEXTURE0);

		for(const layer of this.parallaxLayers)
		{
			gl.bindTexture(gl.TEXTURE_2D, layer.texture);

			this.spriteBoard.drawProgram.uniformF('u_size', layer.width, layer.width);
			this.spriteBoard.drawProgram.uniformF('u_parallax', layer.parallax, 0);

			const from = layer.props.get('from') ?? 'bottom';

			let anchor = this.spriteBoard.height + (-this.height + layer.offset) * zoom;

			if(from === 'center')
			{
				anchor = (0.5 * this.spriteBoard.height) + (0.5 * -this.height + layer.offset) * zoom;
			}
			else if(from === 'top')
			{
				anchor = (this.height + layer.offset) * zoom;
			}

			this.setRectangle(
				0
				, anchor
				, layer.width * zoom
				, layer.height * zoom
				// , layer.width
			);

			gl.bindFramebuffer(gl.FRAMEBUFFER, this.spriteBoard.drawBuffer);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}

		this.spriteBoard.drawProgram.uniformI('u_renderParallax', 0);

		// Cleanup...
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	/**
	 * Load an image and track the load as a Promise in `this.imagePromises[src]`
	 * @param {string|URL} src - The image URL to load
	 * @returns {Promise<HTMLImageElement>} - A promise that resolves to the loaded HTMLImageElement
	 */
	static loadImage(src)
	{
		/** @type {{[key: string]: Promise<HTMLImageElement>}} */
		this.imagePromises;

		if(!this.imagePromises)
		{
			this.imagePromises = {};
		}

		src = String(src);

		if(this.imagePromises[src])
		{
			return this.imagePromises[src];
		}

		this.imagePromises[src] = new Promise(accept=>{
			const image = new Image();
			image.src   = src;
			image.addEventListener('load', (event)=>{
				accept(image);
			});
		});

		return this.imagePromises[src];
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
