export class Matrix
{
	static identity()
	{
		return [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1],
		];
	}

	static translate(dx, dy)
	{
		return [
			[1, 0, dx],
			[0, 1, dy],
			[0, 0,  1],
		];
	}

	static scale(dx, dy)
	{
		return [
			[dx, 0, 0],
			[0, dy, 0],
			[0, 0,  1],
		];
	}

	static rotate(theta)
	{
		const s = Math.sin(theta);
		const c = Math.cos(theta);

		return [
			[c, -s, 0],
			[s,  c, 0],
			[0,  0, 1],
		];
	}

	static shearX(s)
	{
		return [
			[1, s, 0],
			[0, 1, 0],
			[0, 0, 1],
		];
	}

	static shearY(s)
	{
		return [
			[1, 0, 0],
			[s, 1, 0],
			[0, 0, 1],
		];
	}

	static multiply(matA, matB)
	{
		if(matA.length !== matB.length)
		{
			throw new Error('Invalid matrices');
		}

		if(matA[0].length !== matB.length)
		{
			throw new Error('Incompatible matrices');
		}

		const output = Array(matA.length).fill().map(() => Array(matB[0].length).fill(0));

		for(let i = 0; i < matA.length; i++)
		{
			for(let j = 0; j < matB[0].length; j++)
			{
				for(let k = 0; k < matA[0].length; k++)
				{
					output[i][j] += matA[i][k] * matB[k][j];
				}
			}
		}

		return output;
	}

	static composite(...mats)
	{
		let output = this.identity();

		for(let i = 0; i < mats.length; i++)
		{
			output = this.multiply(output, mats[i]);
		}

		return output;
	}

	static transform(points, matrix)
	{
		const output = [];

		for(let i = 0; i < points.length; i += 2)
		{
			const point = [points[i], points[i + 1], 1];

			for(const row of matrix)
			{
				output.push(
					point[0] * row[0]
					+ point[1] * row[1]
					+ point[2] * row[2]
				)
			}
		}

		return new Float32Array(output.filter((_, k) => (1 + k) % 3));
	}
}
