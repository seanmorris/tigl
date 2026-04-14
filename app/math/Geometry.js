/**
 * @typedef {[number, number, number]} LineIntersection
 */

/**
 * Helper for some Geometric functions
 */
export class Geometry
{
	/**
	 * Check if two lines intersect.
	 * @param {number} x1a - The x value of the start point of line A
	 * @param {number} y1a - The y value of the start point of line A
	 * @param {number} x2a - The x value of the end point of line A
	 * @param {number} y2a - The y value of the end point of line A
	 * @param {number} x1b - The x value of the start point of line B
	 * @param {number} y1b - The y value of the start point of line B
	 * @param {number} x2b - The x value of the end point of line B
	 * @param {number} y2b - The y value of the end point of line B
	 * @returns {LineIntersection|false} - The intersection point, or false if the lines do not intersect
	 */
	static lineIntersectsLine(x1a, y1a, x2a, y2a, x1b, y1b, x2b, y2b)
	{
		const ax = x2a - x1a;
		const ay = y2a - y1a;

		const bx = x2b - x1b;
		const by = y2b - y1b;

		const crossProduct = ax * by - ay * bx;

		// Parallel Lines cannot intersect
		if(crossProduct === 0)
		{
			return false;
		}

		const cx = x1b - x1a;
		const cy = y1b - y1a;

		// Is our point within the bounds of line a?
		const d = (cx * ay - cy * ax) / crossProduct;
		if(d < 0 || d > 1)
		{
			return false;
		}

		// Is our point within the bounds of line b?
		const t = (cx * by - cy * bx) / crossProduct;
		if(t < 0 || t > 1)
		{
			return false;
		}

		const x = x1a + t * ax;
		const y = y1a + t * ay;

		return [x, y, t];
	}
}
