import { Bag } from 'curvature/base/Bag';
import { Background  } from './Background';

import { Gl2d } from '../gl2d/Gl2d';
import { Camera } from './Camera';
import { Sprite } from './Sprite';
import { Bindable } from 'curvature/base/Bindable';
import { SpriteSheet } from './SpriteSheet';

export class SpriteBoard
{
	constructor(element, map)
	{
		this[Bindable.Prevent] = true;

		this.map = map;
		this.sprites = new Bag;

		this.mouse = {
			x: null
			, y: null
			, clickX: null
			, clickY: null
		};

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
			, 'u_resolution'
			, 'u_ripple'
			, 'u_size'
			, 'u_tileSize'
			, 'u_tileCount'
			, 'u_region'
			, 'u_background'
			, 'u_mapTextureSize'
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

		this.selected = {
			localX:    null
			, localY:  null
			, globalX: null
			, globalY: null
			, startGlobalX: null
			, startGlobalY: null
		};

		this.selected = Bindable.makeBindable(this.selected);

		this.background  = new Background(this, map);
		const w = 1280;
		const spriteSheet = new SpriteSheet;

		for(const i in Array(16).fill())
		{
			const barrel = new Sprite({
				src: 'barrel.png',
				spriteBoard: this,
				spriteSheet
			});
			barrel.x = 32 + (i * 64) % w;
			barrel.y = Math.trunc((i * 32) / w) * 32;
			this.sprites.add(barrel);
		}

		this.sprites.add(this.background);

		this.following = null;
	}

	unselect()
	{
		if(this.selected.localX === null)
		{
			return false;
		}

		this.selected.localX  = null;
		this.selected.localY  = null;
		this.selected.globalX = null;
		this.selected.globalY = null;

		return true;
	}

	draw()
	{
		if(this.following)
		{
			Camera.x = (16 + this.following.sprite.x) * this.gl2d.zoomLevel || 0;
			Camera.y = (16 + this.following.sprite.y) * this.gl2d.zoomLevel || 0;
		}

		const gl = this.gl2d.context;

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		gl.clearColor(0, 0, 0, 0);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectBuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.clear(gl.COLOR_BUFFER_BIT);

		this.drawProgram.uniformI('u_renderMode', this.renderMode);
		this.drawProgram.uniformF('u_resolution', gl.canvas.width, gl.canvas.height);
		this.drawProgram.uniformF('u_size', Camera.width, Camera.height);
		this.drawProgram.uniformF('u_scale', this.gl2d.zoomLevel, this.gl2d.zoomLevel);
		this.drawProgram.uniformF('u_region', 0, 0, 0, 0);
		this.drawProgram.uniformF(
			'u_ripple'
			, Math.PI / 8
			, performance.now() / 200 // + -Camera.y
			, 1
		);

		let sprites = this.sprites.items();

		sprites.forEach(s => s.z = s instanceof Background ? -1 : s.y);

		window.smProfiling && console.time('sort');

		sprites.sort((a,b) => {
			if((a instanceof Background) && !(b instanceof Background))
			{
				return -1;
			}

			if((b instanceof Background) && !(a instanceof Background))
			{
				return 1;
			}

			if(a.z === undefined)
			{
				return -1;
			}

			if(b.z === undefined)
			{
				return 1;
			}

			return a.z - b.z;
		});

		if(window.smProfiling)
		{
			console.timeEnd('sort');
			window.smProfiling = false;
		}

		sprites.forEach(s => s.draw());

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
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE0);
	}

	resize(width, height)
	{
		const gl = this.gl2d.context;

		width  = width  || this.gl2d.element.width;
		height = height || this.gl2d.element.height;

		Camera.x *= this.gl2d.zoomLevel;
		Camera.y *= this.gl2d.zoomLevel;

		Camera.width  = width  / this.gl2d.zoomLevel;
		Camera.height = height / this.gl2d.zoomLevel;

		this.background.resize(Camera.width, Camera.height);

		gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, Camera.width * this.gl2d.zoomLevel
			, Camera.height * this.gl2d.zoomLevel
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
			, Camera.width * this.gl2d.zoomLevel
			, Camera.height * this.gl2d.zoomLevel
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, null
		);
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
