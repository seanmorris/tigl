/**
 * Represents a Rectangle
 */
export class Rectangle
{
	/**
	 * Construct a Rectangle object
	 * @param {number} x1 - The x value of the top/left
	 * @param {number} y1 - The y value of the top/left
	 * @param {number} x2 - The x value of the bottom/right
	 * @param {number} y2 - The y value of the bottom/right
	 */
	constructor(x1, y1, x2, y2)
	{
		if(x1 > x2 || y1 > y2)
		{
			throw new Error('Not a rectangle!');
		}

		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
	}

	/**
	 * Check if a Rectangle contains a point
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @returns {boolean} - Whether the Rectangle contains the point
	 */
	contains(x, y)
	{
		if(x < this.x1 || x >= this.x2)
		{
			return false;
		}

		if(y < this.y1 || y >= this.y2)
		{
			return false;
		}

		return true;
	}

	/**
	 * Check if a Rectangle overlaps another Rectangle
	 * @param {Rectangle} other - The other Rectangle to compare against
	 * @returns {boolean} - Whether the Rectangle contains the point
	 */
	isOverlapping(other)
	{
		if(this.x1 >= other.x2 || other.x1 >= this.x2)
		{
			return false;
		}

		if(this.y1 >= other.y2 || other.y1 >= this.y2)
		{
			return false;
		}

		return true;
	}

	/**
	 * Check if a Rectangle is flush with another Rectangle (one edge is equal)
	 * @param {Rectangle} other - The other Rectangle to compare against
	 * @returns {boolean} - Whether the Rectangle contains the point
	 */
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

		return false;
	}

	/**
	 * Find the intersecting sub-Rectangle of two Rectangles
	 * @param {Rectangle} other - The other Rectangle to compare against
	 * @returns {Rectangle|void} - The Rectangle representing the intersection
	 */
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

	/**
	 * Check if `other` is entirely INSIDE the current Rectangle
	 * @param {Rectangle} other - The other Rectangle to compare against
	 * @returns {boolean} - Whether `other` is completely INSIDE the current Rectangle
	 */
	isInside(other)
	{
		return this.x1 >= other.x1
			&& this.y1 >= other.y1
			&& this.x2 <= other.x2
			&& this.y2 <= other.y2;
	}

	/**
	 * Check if `other` is entirely OUTSIDE the current Rectangle
	 * @param {Rectangle} other - The other Rectangle to compare against
	 * @returns {boolean} - Whether `other` is completely OUTSIDE the current Rectangle
	 */
	isOutside(other)
	{
		return !other.isInside(this);
	}

	/**
	 * Clone a Rectangle object
	 * @param {Rectangle} rectangle - The other Rectangle to compare against
	 * @returns {Rectangle} - A Rectangle of the same dimensions as the current Rectangle
	 */
	static clone(rectangle)
	{
		return new Rectangle(
			rectangle.x1,
			rectangle.y1,
			rectangle.x2,
			rectangle.y2,
		);
	}

	/**
	 * Perform Minkowski-expansion of two Rectangles
	 * @param {Rectangle} other - The other Rectangle to expand by
	 * @param {number} cxa - The x value of the current rectangle
	 * @param {number} cya - The y value of the current rectangle
	 * @param {number} cxb - The x value of `other`
	 * @param {number} cyb - The y value of `other`
	 * @returns {Rectangle} - The expanded Rectangle
	 */
	expand(other, cxa = 0.5, cya = 1.0, cxb = 0.5, cyb = 1.0)
	{
		const ex = other.x2 - other.x1;
		const ey = other.y2 - other.y1;

		const cx = (cxa + cxb) * 0.5;
		const cy = (cya + cyb) * 0.5;

		const x1 = this.x1 + -ex * (1 - cx);
		const x2 = this.x2 +  ex * cx;
		const y1 = this.y1 + -ey * (1 - cy);
		const y2 = this.y2 + ey * cy;

		return new Rectangle(x1, y1, x2, y2);
	}

	/**
	 * Break the Rectangle into a set of points representing its bounds
	 * @returns {Array<number>} - A list of points representing the lines
	 */
	toLines()
	{
		const x1 = this.x1;
		const y1 = this.y1;
		const x2 = this.x2;
		const y2 = this.y2;

		return [
			x1, y1, x2, y1, // Top
			x2, y1, x2, y2, // Right
			x1, y2, x2, y2, // Bottom
			x1, y1, x1, y2, // Left
		];
	}

	/**
	 * Break the Rectangle into a set of points representing its triangularization in `dim` dimensions
	 * @param {number} dim - Number of dimensions to represent triangles in
	 * @returns {Array<number>} - A list of points representing the triangles
	 */
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
