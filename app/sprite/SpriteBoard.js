import { Bag } from 'curvature/base/Bag';
import { Bindable } from 'curvature/base/Bindable';

import { Gl2d } from '../gl2d/Gl2d';
import { Camera } from './Camera';
import { MapRenderer } from './MapRenderer';
import { Parallax } from './Parallax';

export class SpriteBoard
{
	constructor({element, world})
	{
		this[Bindable.Prevent] = true;

		this.maps = [];

		this.world = world;
		this.sprites = new Set;
		this.currentMap = null;

		this.mouse = {
			x: null
			, y: null
			, clickX: null
			, clickY: null
		};

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
			, 'u_scale'
			, 'u_scroll'
			, 'u_stretch'
			, 'u_tileSize'
			, 'u_resolution'
			, 'u_mapTextureSize'

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

		this.colorLocation   = this.drawProgram.uniforms.u_color;
		this.tilePosLocation = this.drawProgram.uniforms.u_tileNo;
		this.regionLocation  = this.drawProgram.uniforms.u_region;

		this.drawLayer = this.gl2d.createTexture(1000, 1000);
		this.effectLayer = this.gl2d.createTexture(1000, 1000);

		this.drawBuffer = this.gl2d.createFramebuffer(this.drawLayer);
		this.effectBuffer = this.gl2d.createFramebuffer(this.effectLayer);

		document.addEventListener(
			'mousemove', (event)=>{
				this.mouse.x = event.clientX;
				this.mouse.y = event.clientY;
			}
		);

		this.mapRenderers = new Map;
		this.following = null;
	}

	draw(delta)
	{
		if(this.following)
		{
			Camera.x = (16 + this.following.sprite.x) * this.gl2d.zoomLevel || 0;
			Camera.y = (16 + this.following.sprite.y) * this.gl2d.zoomLevel || 0;

			const maps = [...this.world.getMapsForPoint(this.following.x, this.following.y)];

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
		}

		const visibleMaps = this.world.getMapsForRect(
			this.following.sprite.x
			, this.following.sprite.y
			, 64//Camera.width * 0.125
			, 64//Camera.height * 0.125
		);

		const mapRenderers = new Set;

		visibleMaps.forEach(map => {
			if(this.mapRenderers.has(map))
			{
				mapRenderers.add(this.mapRenderers.get(map));
				return;
			}
			const renderer = new MapRenderer({spriteBoard: this, map});
			mapRenderers.add(renderer);
			renderer.resize(Camera.width, Camera.height);
			this.mapRenderers.set(map, renderer);
		});

		new Set(this.mapRenderers.keys())
			.difference(visibleMaps)
			.forEach(m => this.mapRenderers.delete(m));

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

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		if(this.currentMap && this.currentMap.backgroundColor)
		{
			const color = this.currentMap.backgroundColor.substr(1);

			const r = parseInt(color.substr(-6, 2), 16) / 255;
			const b = parseInt(color.substr(-4, 2), 16) / 255;
			const g = parseInt(color.substr(-2, 2), 16) / 255;
			const a = color.length === 8 ? parseInt(color.substr(-8, 2), 16) / 255 : 1;

			gl.clearColor(r, g, b, a);
		}
		else
		{
			gl.clearColor(0, 0, 0, 1);
		}

		gl.clear(gl.COLOR_BUFFER_BIT);

		window.smProfiling && console.time('draw-parallax');
		this.parallax && this.parallax.draw();
		window.smProfiling && console.timeEnd('draw-parallax');

		this.drawProgram.uniformF('u_size', Camera.width, Camera.height);


		window.smProfiling && console.time('draw-tiles');
		this.mapRenderers.values().forEach(mr => mr.draw());
		window.smProfiling && console.timeEnd('draw-tiles');

		window.smProfiling && console.time('draw-sprites');
		let sprites = [...this.sprites];
		// sprites.forEach(s => s.z = s.y);
		sprites.sort((a,b) => {
			if(a.y === undefined)
			{
				return -1;
			}

			if(b.y === undefined)
			{
				return 1;
			}

			return a.y - b.y;
		});
		sprites.forEach(s => s.visible && s.draw(delta));
		window.smProfiling && console.timeEnd('draw-sprites');

		if(window.smProfiling)
		{
			window.smProfiling = false;
		}

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
		gl.activeTexture(gl.TEXTURE4);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	resize(width, height)
	{
		const gl = this.gl2d.context;

		width  = width  || this.gl2d.element.width;
		height = height || this.gl2d.element.height;

		this.width = width;
		this.height = height;

		Camera.x *= this.gl2d.zoomLevel;
		Camera.y *= this.gl2d.zoomLevel;

		Camera.width  = width  / this.gl2d.zoomLevel;
		Camera.height = height / this.gl2d.zoomLevel;

		this.mapRenderers.values().forEach(mr => mr.resize(Camera.width, Camera.height))

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

	setRectangle(x, y, width, height)
	{
		const gl = this.gl2d.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.drawProgram.buffers.a_position);

		const x1 = x;
		const x2 = x + width;
		const y1 = y;
		const y2 = y + height;

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
