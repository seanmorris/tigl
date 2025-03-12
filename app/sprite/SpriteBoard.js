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

		const gl = this.gl2d.context;

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		this.program = this.gl2d.createProgram(
			this.gl2d.createShader('sprite/texture.vert')
			, this.gl2d.createShader('sprite/texture.frag')
		);

		// this.overlayProgram = this.gl2d.createProgram(
		// 	this.gl2d.createShader('overlay/overlay.vert')
		// 	, this.gl2d.createShader('overlay/overlay.frag')
		// );

		gl.useProgram(this.program);

		this.positionBuffer = gl.createBuffer();
		this.texCoordBuffer = gl.createBuffer();
		this.effCoordBuffer = gl.createBuffer();

		this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
		this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
		this.effCoordLocation = gl.getAttribLocation(this.program, 'a_effCoord');

		this.imageLocation      = gl.getUniformLocation(this.program, 'u_image');
		this.effectLocation     = gl.getUniformLocation(this.program, 'u_effect');
		this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
		this.colorLocation      = gl.getUniformLocation(this.program, 'u_color');
		this.tilePosLocation    = gl.getUniformLocation(this.program, 'u_tileNo');
		this.rippleLocation     = gl.getUniformLocation(this.program, 'u_ripple');
		this.sizeLocation       = gl.getUniformLocation(this.program, 'u_size');
		this.scaleLocation      = gl.getUniformLocation(this.program, 'u_scale');
		this.regionLocation     = gl.getUniformLocation(this.program, 'u_region');
		this.rectLocation       = gl.getUniformLocation(this.program, 'u_rect');

		// this.overlayLocation   = gl.getAttribLocation(this.overlayProgram, 'a_position');
		// this.overlayResolution = gl.getUniformLocation(this.overlayProgram, 'u_resolution');
		// this.overlayColor      = gl.getUniformLocation(this.overlayProgram, 'u_color');

		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.enableVertexAttribArray(this.positionLocation);
		gl.vertexAttribPointer(
			this.positionLocation
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		gl.enableVertexAttribArray(this.texCoordLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.vertexAttribPointer(
			this.texCoordLocation
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		this.drawLayer = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, 1000
			, 1000
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, null
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		this.effectLayer = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, 1000
			, 1000
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, null
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		this.drawBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER
			, gl.COLOR_ATTACHMENT0
			, gl.TEXTURE_2D
			, this.drawLayer
			, 0
		);

		this.effectBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectBuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER
			, gl.COLOR_ATTACHMENT0
			, gl.TEXTURE_2D
			, this.effectLayer
			, 0
		);

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
		const w = 128;
		const spriteSheet = new SpriteSheet;

		for(const i in Array(16).fill())
		{
			const barrel = new Sprite({
				src: 'barrel.png',
				spriteBoard: this,
				spriteSheet
			});
			barrel.x = 32 + (i * 32) % w;
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

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.effectBuffer);

		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawBuffer);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		gl.uniform2f(
			this.resolutionLocation
			, gl.canvas.width
			, gl.canvas.height
		);

		gl.uniform3f(
			this.rippleLocation
			, 0
			, 0
			, 0
		);

		gl.uniform2f(
			this.sizeLocation
			, Camera.width
			, Camera.height
		);

		gl.uniform2f(
			this.scaleLocation
			, this.gl2d.zoomLevel
			, this.gl2d.zoomLevel
		);

		gl.uniform4f(
			this.regionLocation
			, 0
			, 0
			, 0
			, 0
		);

		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

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

		gl.uniform3f(
			this.rippleLocation
			, Math.PI / 8
			, performance.now() / 200 // + -Camera.y
			, 1
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.drawLayer);
		gl.uniform1i(this.imageLocation, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.effectLayer);
		gl.uniform1i(this.effectLocation, 1);

		this.setRectangle(
			0
			, this.gl2d.element.height
			, this.gl2d.element.width
			, -this.gl2d.element.height
		);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		gl.uniform3f(
			this.rippleLocation
			, 0
			, 0
			, 0
		);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.uniform1i(this.imageLocation, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.uniform1i(this.effectLocation, 1);

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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

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
