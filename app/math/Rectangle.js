export class Rectangle
{
	constructor(x1, y1, x2, y2)
	{
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
	}

	contains(x, y)
	{
		if(x <= this.x1 || x >= this.x2)
		{
			return false;
		}

		if(y <= this.y1 || y >= this.y2)
		{
			return false;
		}

		return true;
	}

	isOverlapping(other)
	{
		if(this.x1 >= other.x2 || this.x2 <= other.x1)
		{
			return false;
		}

		if(this.y1 >= other.y2 || this.y2 <= other.y1)
		{
			return false;
		}

		return true;
	}

	isFlushWith(other)
	{
		if(this.x1 > other.x2 || other.x1 > this.x2)
		{
			return false;
		}

		if(this.y1 > other.y2 || other.y1 > this.y2)
		{
			return false;
		}

		if(this.x1 === other.x2 || other.x1 === this.x2)
		{
			return true;
		}

		if(this.y1 === other.y2 || other.y1 === this.y2)
		{
			return true;
		}
	}

	intersection(other)
	{
		if(!this.isOverlapping(other))
		{
			return;
		}

		return new (this.constructor)(
			Math.max(this.x1, other.x1), Math.max(this.y1, other.y1)
			, Math.min(this.x2, other.x2), Math.min(this.y2, other.y2)
		);
	}

	isInside(other)
	{
		return this.x1 >= other.x1
			&& this.y1 >= other.y1
			&& this.x2 <= other.x2
			&& this.y2 <= other.y2;
	}

	isOutside(other)
	{
		return other.isInside(this);
	}

	toTriangles(dim = 2)
	{
		if(dim === 2)
		{
			return [
				this.x1, this.y1,
				this.x2, this.y1,
				this.x1, this.y2,
				this.x1, this.y2,
				this.x2, this.y1,
				this.x2, this.y2,
			];
		}

		if(dim === 3)
		{
			return [
				this.x1, this.y1, 1,
				this.x2, this.y1, 1,
				this.x1, this.y2, 1,
				this.x1, this.y2, 1,
				this.x2, this.y1, 1,
				this.x2, this.y2, 1,
			];
		}

		if(dim === 4)
		{
			return [
				this.x1, this.y1, 0, 1,
				this.x2, this.y1, 0, 1,
				this.x1, this.y2, 0, 1,
				this.x1, this.y2, 0, 1,
				this.x2, this.y1, 0, 1,
				this.x2, this.y2, 0, 1,
			];
		}

		return [
			this.x1, this.y1, ...(dim > 2 ? Array(-2+dim).fill(0): []),
			this.x2, this.y1, ...(dim > 2 ? Array(-2+dim).fill(0): []),
			this.x1, this.y2, ...(dim > 2 ? Array(-2+dim).fill(0): []),
			this.x1, this.y2, ...(dim > 2 ? Array(-2+dim).fill(0): []),
			this.x2, this.y1, ...(dim > 2 ? Array(-2+dim).fill(0): []),
			this.x2, this.y2, ...(dim > 2 ? Array(-2+dim).fill(0): []),
		];
	}
}
