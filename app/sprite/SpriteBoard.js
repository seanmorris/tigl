import { Bindable    } from 'curvature/base/Bindable';

import { Sprite      } from './Sprite';
import { Background  } from './Background';

import { Gl2d } from '../gl2d/Gl2d';

export class SpriteBoard extends Gl2d
{
	constructor(element)
	{
		super(element);

		this.camera = {
			x:        0
			, y:      0
			, width:  0
			, height: 0
		};

		this.mouse = {
			x:        null
			, y:      null
			, clickX: null
			, clickY: null
		};

		this.camera = Bindable.makeBindable(this.camera);

		this.camera.width  = this.element.width;
		this.camera.height = this.element.height;

		const gl = this.context;

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		this.program = this.createProgram(
			this.createShader('sprite/texture.vert')
			, this.createShader('sprite/texture.frag')
		);

		this.overlayProgram = this.createProgram(
			this.createShader('overlay/overlay.vert')
			, this.createShader('overlay/overlay.frag')
		);

		this.positionLocation   = gl.getAttribLocation(this.program, "a_position");
		this.texCoordLocation   = gl.getAttribLocation(this.program, "a_texCoord");

		this.resolutionLocation = gl.getUniformLocation(this.program, "u_resolution");
		this.colorLocation      = gl.getUniformLocation(this.program, "u_color");

		this.overlayPosition   = gl.getAttribLocation(this.overlayProgram, "a_position");
		this.overlayResolution = gl.getUniformLocation(this.overlayProgram, "u_resolution");
		this.overlayColor      = gl.getUniformLocation(this.overlayProgram, "u_color");

		this.positionBuffer = gl.createBuffer();
		this.texCoordBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0,  0.0,
			1.0,  0.0,
			0.0,  1.0,
			0.0,  1.0,
			1.0,  0.0,
			1.0,  1.0,
		]), gl.STATIC_DRAW);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

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
		};

		this.element.addEventListener(
			'click', (event)=>{
				this.mouse.clickX = event.clientX;
				this.mouse.clickY = event.clientY;

				this.selected.localX = Math.floor((this.mouse.clickX
					+ (this.camera.x % 32)
					- (Math.floor(this.camera.width /2) % 32)
				) / 32);

				this.selected.localY = Math.floor((this.mouse.clickY
					+ (this.camera.y % 32)
					- (Math.floor(this.camera.height /2) % 32)
				) / 32);

				this.selected.globalX = (this.selected.localX
					- Math.floor(Math.floor(this.camera.width /2) / 32)
					+ (this.camera.x < 0
						? Math.ceil(this.camera.x /32)
						: Math.floor(this.camera.x /32)
					)
				);

				this.selected.globalY = (this.selected.localY
					- Math.floor(Math.floor(this.camera.height /2) / 32)
					+ (this.camera.y < 0
						? Math.ceil(this.camera.y /32)
						: Math.floor(this.camera.y /32)
					)
				);				
			}
		);
	}

	moveCamera(x, y)
	{
		let originalX = this.camera.x;
		let originalY = this.camera.y;

		this.camera.x = x;
		this.camera.y = y;

		this.mouse.clickX += (originalX - this.camera.x);
		this.mouse.clickY += (originalY - this.camera.y);
	}

	draw()
	{
		const gl = this.context;

		super.draw();

		gl.uniform2f(
			this.resolutionLocation
			, gl.canvas.width
			, gl.canvas.height
		);

		this.sprites.map(s => s.z = s.y);

		this.sprites.sort((a,b)=>{
			if(b.z === undefined)
			{
				return 0;
			}
			return a.z - b.z;
		});

		this.sprites.map(s => s.draw());

		if(this.selected.localX === null)
		{
			return;
		}

		gl.useProgram(this.overlayProgram);

		gl.uniform2f(
			this.overlayResolution
			, gl.canvas.width
			, gl.canvas.height
		);

		this.setRectangle(
			this.selected.globalX * 32
				- this.camera.x
				+ Math.floor(this.camera.width /2)
			, this.selected.globalY * 32
				- this.camera.y
				+ Math.floor(this.camera.height /2)
			, 32
			, 32
		);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	simulate()
	{
		this.sprites.map(s => s.simulate());
	}

	resize(x, y)
	{
		x = x || this.element.width;
		y = y || this.element.height;


		this.background.resize(
			Math.round(x / 2 + 32)
			, Math.round(y / 2 + 32)
		);

		super.resize(x, y);
	}

	setRectangle(x, y, width, height)
	{
		const gl = this.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

		gl.vertexAttribPointer(
			this.overlayPosition
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
