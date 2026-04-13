import { Bindable } from 'curvature/base/Bindable';

import { MapRenderer } from './MapRenderer';
import { Parallax } from './Parallax';

import { Gl2d } from '../gl2d/Gl2d';
import { Camera } from './Camera';
import { Region } from './Region';

/**
 * @import { Session } from '../session/Session';
 * @import { World } from '../world/World';
*/

/**
 * Renders the whole game
 */
export class SpriteBoard
{
	/**
	 * Construct a SpriteBoard
	 * @param {object} param0 - Named params
	 * @param {HTMLCanvasElement} param0.element - The vanvas to render to
	 * @param {Session} param0.session - The current Session
	 */
	constructor({element, session})
	{
		this[Bindable.Prevent] = true;

		this.session = session;

		this.maps = [];

		this.currentMap = null;
		this.sprites = new Set;
		this.regions = new Set;

		this.screenScale = 1;
		this.zoomLevel = 2;

		this.parallax = null;

		this.width = element.width;
		this.height = element.height;

		Camera.width  = element.width;
		Camera.height = element.height;

		this.gl2d = new Gl2d(element);

		this.gl2d.enableBlending();

		const attributes = ['a_position', 'a_texCoord'];
		const uniforms = [
			'u_image'
			, 'u_effect'
			, 'u_tiles'
			, 'u_tileMapping'

			, 'u_size'
			, 'u_scroll'
			, 'u_tileSize'
			, 'u_resolution'
			, 'u_mapTextureSize'
			, 'u_tint'

			, 'u_region'
			, 'u_parallax'
			, 'u_time'

			, 'u_renderTiles'
			, 'u_renderParallax'
			, 'u_renderMode'
		];

		this.renderMode = 0;

		this.drawProgram = this.gl2d.createProgram({
			vertexShader: this.gl2d.createShader('sprite/texture.vert')
			, fragmentShader: this.gl2d.createShader('sprite/texture.frag')
			, attributes
			, uniforms
		});

		this.drawProgram.use();

		this.drawLayer = this.gl2d.createTexture(1, 1);
		this.effectLayer = this.gl2d.createTexture(1, 1);
		this.skyTexture = this.gl2d.createTexture(1, 1);

		this.drawBuffer = this.gl2d.createFramebuffer(this.drawLayer);
		this.effectBuffer = this.gl2d.createFramebuffer(this.effectLayer);

		this.mapRenderers = new Map;
		this.following = null;
	}

	/**
	 * Load a world
	 * @param {World} world - The World to load
	 */
	loadWorld(world)
	{
		this.world = world;
	}

	/**
	 * Draw the frame
	 * @param {number} delta - MS since last tick
	 */
	draw(delta)
	{
		if(!this.world)
		{
			return;
		}

		if(this.following)
		{
			const focusX = this.following.x;
			const focusY = this.following.y  + this.following.height * -0.5;

			Camera.x = focusX * this.zoomLevel || 0;
			Camera.y = focusY * this.zoomLevel || 0;

			const maps = [...this.world.getMapsForPoint(focusX, focusY)];

			if(maps[0] && this.currentMap !== maps[0])
			{
				const parallax = this.nextParallax = new Parallax({spriteBoard: this, map: maps[0]});

				this.nextParallax.ready.then(() => {
					if(this.nextParallax === parallax)
					{
						this.parallax = parallax;
					}
				});

				this.currentMap = maps[0];
			}

			const visibleMaps = this.world.getMapsForRect(
				focusX
				, focusY
				, Camera.width
				, Camera.height
			);

			const mapRenderers = new Set;

			visibleMaps.forEach(map => {
				map.visible = true;
				if(this.mapRenderers.has(map))
				{
					mapRenderers.add(this.mapRenderers.get(map));
					return;
				}
				const renderer = new MapRenderer({spriteBoard: this, map, session: this.session});
				mapRenderers.add(renderer);
				renderer.resize(Camera.width, Camera.height);
				this.mapRenderers.set(map, renderer);
			});

			new Set(this.mapRenderers.keys())
			.difference(visibleMaps)
			.forEach(map => {
				this.mapRenderers.delete(map);
				map.visible = false;
			});
		}

		const gl = this.gl2d.context;

		this.drawProgram.uniformF('u_size', Camera.width, Camera.height);
		this.drawProgram.uniformF('u_resolution', gl.canvas.width, gl.canvas.height);
		this.drawProgram.uniformI('u_renderMode', this.renderMode);

		this.drawProgram.uniformF('u_time', performance.now());
		this.drawProgram.uniformF('u_region', 0, 0, 0, 0);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.clearColor(0, 0, 0, 1);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectBuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);

		if(this.currentMap && this.currentMap.backgroundColor)
		{
			// const color = this.currentMap.backgroundColor.substr(1);
			const color = this.currentMap.backgroundColor;

			const r = (0 + color[0]) / 255;
			const b = (0 + color[1]) / 255;
			const g = (0 + color[2]) / 255;
			const a = (0 + color[3]) / 255;

			gl.clearColor(r, g, b, a);
		}
		else
		{
			gl.clearColor(0, 0, 0, 1);
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);

		if(this.currentMap && this.currentMap.props.has('backgroundColorUpper'))
		{
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.skyTexture);

			const color = this.currentMap.props.get('backgroundColorUpper');
			const split = Math.min(1, Math.max(0, this.currentMap.props.get('backgroundSplit') ?? 0.5));

			const r = (0 + color[0]);
			const b = (0 + color[1]);
			const g = (0 + color[2]);
			const a = (0 + color[3]);

			gl.texSubImage2D(
				gl.TEXTURE_2D
				, 0
				, 0
				, 0
				, 1
				, 1
				, gl.RGBA
				, gl.UNSIGNED_BYTE
				, new Uint8Array([r, g, b, a])
			);

			this.setRectangle(
				0
				, this.gl2d.element.height * split
				, this.gl2d.element.width
				, -this.gl2d.element.height * split
			);

			gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}

		gl.clearColor(0, 0, 0, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.clear(gl.COLOR_BUFFER_BIT);

		this.drawProgram.uniformF('u_size', Camera.width, Camera.height);

		let sprites = [...this.sprites];

		sprites.sort((a,b) => {
			const az = a.z ?? a.y ?? undefined;
			const bz = b.z ?? b.y ?? undefined;
			if(az === undefined)
			{
				return -1;
			}

			if(bz === undefined)
			{
				return 1;
			}

			return az - bz;
		});

		this.parallax && this.parallax.draw();
		this.mapRenderers.forEach(mr => mr.draw(delta, 'background'));
		sprites.forEach(s => s.visible && s.draw(delta));
		this.mapRenderers.forEach(mr => mr.draw(delta, 'midground'));
		this.regions.forEach(r => r.draw());
		this.mapRenderers.forEach(mr => mr.draw(delta, 'foreground'));

		// Set the rectangle for both layers
		this.setRectangle(
			0
			, this.gl2d.element.height
			, this.gl2d.element.width
			, -this.gl2d.element.height
		);

		// Switch to the main framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		// Put the drawLayer in tex0
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
		this.drawProgram.uniformI('u_image', 0);

		// Put the effectLayer in tex1
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
		this.drawProgram.uniformI('u_effect', 1);

		// Draw
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		// Cleanup...
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);
		// gl.activeTexture(gl.TEXTURE4);
		// gl.bindTexture(gl.TEXTURE_2D, null);
	}

	/**
	 * Resize the render window
	 * @param {number} width - The new width of the render window
	 * @param {number} height - The new height of the render window
	 */
	resize(width, height)
	{
		const gl = this.gl2d.context;

		width  = width  || this.gl2d.element.width;
		height = height || this.gl2d.element.height;

		this.width = width;
		this.height = height;

		Camera.x *= this.zoomLevel;
		Camera.y *= this.zoomLevel;

		Camera.width  = width  / this.zoomLevel;
		Camera.height = height / this.zoomLevel;

		this.mapRenderers.forEach(mr => mr.resize(Camera.width, Camera.height));

		gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
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

		gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
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

		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	/**
	 * Change the zoom level by a given amount
	 * @param {number} delta - How much to change the zoom by
	 */
	zoom(delta)
	{
		const max = this.screenScale * 32;
		const min = this.screenScale * 0.5;
		const step = 0.05 * this.zoomLevel;

		let zoomLevel = delta * step + this.zoomLevel;

		if(zoomLevel < min)
		{
			zoomLevel = min;
		}
		else if(zoomLevel > max)
		{
			zoomLevel = max;
		}

		if(Math.abs(zoomLevel - 1) < 0.05)
		{
			zoomLevel = 1;
		}

		zoomLevel = Math.trunc(zoomLevel * 256) / 256;

		if(this.zoomLevel !== zoomLevel)
		{
			this.zoomLevel = zoomLevel;
			this.resize();
		}
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
		const gl = this.gl2d.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.drawProgram.buffers.a_texCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			1.0, 0.0,
			0.0, 1.0,
			0.0, 1.0,
			1.0, 0.0,
			1.0, 1.0,
		]), gl.STATIC_DRAW);

		const x1 = x;
		const x2 = x + width;
		const y1 = y;
		const y2 = y + height;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.drawProgram.buffers.a_position);
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
