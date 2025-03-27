export class Geometry
{
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
