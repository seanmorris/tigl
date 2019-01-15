import { Bindable    } from 'curvature/base/Bindable';

import { Background  } from '../sprite/Background';
import { Sprite      } from '../sprite/Sprite';
import { SpriteSheet } from '../sprite/SpriteSheet';
import { Surface     } from '../sprite/Surface';

import { Floor       } from '../world/Floor';

export class Gl2d
{
	constructor(element)
	{
		this.element = element;
		this.context = element.getContext('webgl');
	}

	resize()
	{
		const gl = this.context;

		gl.viewport(
			0
			, 0
			, this.element.width
			, this.element.height
		);

		this.camera.width  = this.element.width;
		this.camera.height = this.element.height;
	}	

	draw()
	{
		const gl = this.context;

		gl.useProgram(this.program);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.clearColor(0, 0, 0, 1);
		// gl.clearColor(1, 1, 1, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	cleanup()
	{
		this.context.deleteProgram(this.program);
	}

	createShader(location)
	{
		const extension = location.substring(location.lastIndexOf('.')+1);
		let   type = null;

		switch(extension.toUpperCase())
		{
			case 'VERT':
				type = this.context.VERTEX_SHADER;
				break;
			case 'FRAG':
				type = this.context.FRAGMENT_SHADER;
				break;
		}

		const shader = this.context.createShader(type);
		const source = require(location);

		this.context.shaderSource(shader, source);
		this.context.compileShader(shader);

		const success = this.context.getShaderParameter(
			shader
			, this.context.COMPILE_STATUS
		);

		if(success)
		{
			return shader;
		}

		console.error(this.context.getShaderInfoLog(shader));

		this.context.deleteShader(shader);
	}

	createProgram(vertexShader, fragmentShader)
	{
		const program = this.context.createProgram();

		this.context.attachShader(program, vertexShader);
		this.context.attachShader(program, fragmentShader);

		this.context.linkProgram(program);

		this.context.detachShader(program, vertexShader);
		this.context.detachShader(program, fragmentShader);
		this.context.deleteShader(vertexShader);
		this.context.deleteShader(fragmentShader);

		if(this.context.getProgramParameter(program, this.context.LINK_STATUS))
		{
			return program;
		}

		console.error(this.context.getProgramInfoLog(program));

		this.context.deleteProgram(program);

		return program;
	}
}
