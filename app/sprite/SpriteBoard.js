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

		this.mouse = {
			x:        null
			, y:      null
			, clickX: null
			, clickY: null
		};

		this.sprites = new Bag;

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

		this.overlayProgram = this.gl2d.createProgram(
			this.gl2d.createShader('overlay/overlay.vert')
			, this.gl2d.createShader('overlay/overlay.frag')
		);

		this.positionLocation   = gl.getAttribLocation(this.program, 'a_position');
		this.texCoordLocation   = gl.getAttribLocation(this.program, 'a_texCoord');

		this.positionBuffer = gl.createBuffer();
		this.texCoordBuffer = gl.createBuffer();

		this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
		this.colorLocation      = gl.getUniformLocation(this.program, 'u_color');

		this.overlayLocation   = gl.getAttribLocation(this.overlayProgram, 'a_position');
		this.overlayResolution = gl.getUniformLocation(this.overlayProgram, 'u_resolution');
		this.overlayColor      = gl.getUniformLocation(this.overlayProgram, 'u_color');

		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.enableVertexAttribArray(this.positionLocation);
		gl.vertexAttribPointer(
			this.positionLocation
			, 3
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
			barrel.x = (i * 32) % w;
			barrel.y = Math.trunc((i * 32) / w) * 32;
			this.sprites.add(barrel);
		}
		this.sprites.add(this.background);
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
		const gl = this.gl2d.context;

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		gl.uniform2f(
			this.resolutionLocation
			, gl.canvas.width
			, gl.canvas.height
		);

		// gl.clearColor(0, 0, 0, 0);
		// gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(this.program);

		gl.uniform2f(
			this.gl2d.resolutionLocation
			, Camera.width
			, Camera.height
		);

		let sprites = this.sprites.items();

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

		sprites.forEach(s => {
			s.z = s instanceof Background ? -1 : s.y;
			s.draw();
		});
	}

	resize(x, y)
	{
		x = x || this.gl2d.element.width;
		y = y || this.gl2d.element.height;

		Camera.width  = x / this.gl2d.zoomLevel;
		Camera.height = y / this.gl2d.zoomLevel;

		this.background.resize(Camera.width, Camera.height);
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
			x1, y1, this.z,
			x2, y1, this.z,
			x1, y2, this.z,
			x1, y2, this.z,
			x2, y1, this.z,
			x2, y2, this.z,
		]), gl.STREAM_DRAW);
	}
}
