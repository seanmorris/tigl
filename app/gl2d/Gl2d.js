class Program
{
	context = null;
	program = null;

	attributes = {};
	buffers = {};
	uniforms = {};

	constructor({gl, vertexShader, fragmentShader, uniforms, attributes})
	{
		this.context = gl;
		this.program = gl.createProgram();

		gl.attachShader(this.program, vertexShader);
		gl.attachShader(this.program, fragmentShader);

		gl.linkProgram(this.program);

		gl.detachShader(this.program, vertexShader);
		gl.detachShader(this.program, fragmentShader);

		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		if(!gl.getProgramParameter(this.program, gl.LINK_STATUS))
		{
			console.error(gl.getProgramInfoLog(this.program));
			gl.deleteProgram(this.program);
		}

		for(const uniform of uniforms)
		{
			const location = gl.getUniformLocation(this.program, uniform);

			if(location === null)
			{
				console.warn(`Uniform ${uniform} not found.`);
				continue;
			}

			this.uniforms[uniform] = location;
		}

		for(const attribute of attributes)
		{
			const location = gl.getAttribLocation(this.program, attribute);

			if(location === null)
			{
				console.warn(`Attribute ${attribute} not found.`);
				continue;
			}

			const buffer = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.enableVertexAttribArray(location);
			gl.vertexAttribPointer(
				location
				, 2
				, gl.FLOAT
				, false
				, 0
				, 0
			);

			this.attributes[attribute] = location;
			this.buffers[attribute] = buffer;
		}
	}

	use()
	{
		this.context.useProgram(this.program);
	}

	uniformF(name, ...floats)
	{
		const gl = this.context;
		gl[`uniform${floats.length}f`](this.uniforms[name], ...floats);
	}

	uniformI(name, ...ints)
	{
		const gl = this.context;
		gl[`uniform${ints.length}i`](this.uniforms[name], ...ints);
	}
}

export class Gl2d
{
	constructor(element)
	{
		this.element = element || document.createElement('canvas');
		this.context = this.element.getContext('webgl');
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
			shader, this.context.COMPILE_STATUS
		);

		if(success)
		{
			return shader;
		}

		console.error(this.context.getShaderInfoLog(shader));

		this.context.deleteShader(shader);
	}

	createProgram({vertexShader, fragmentShader, uniforms, attributes})
	{
		const gl = this.context;
		return new Program({gl, vertexShader, fragmentShader, uniforms, attributes});
	}

	createTexture(width, height)
	{
		const gl = this.context;
		const texture = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, width
			, height
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, null
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		return texture;
	}

	createFramebuffer(texture)
	{
		const gl = this.context;

		const framebuffer = gl.createFramebuffer();

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

		gl.framebufferTexture2D(
			gl.FRAMEBUFFER
			, gl.COLOR_ATTACHMENT0
			, gl.TEXTURE_2D
			, texture
			, 0
		);

		return framebuffer;
	}

	enableBlending()
	{
		const gl = this.context;
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);
	}
}
