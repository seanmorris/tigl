const depthSymbol = Symbol('depth');

const SUBGRID_BITS = 8;
const SUBGRID_SIZE = 1 << SUBGRID_BITS;
const SUBGRID_INVR = 1 / SUBGRID_SIZE;
const MAX_GRID_IDX = 2 ** (Math.log2( 1 + Number.MAX_SAFE_INTEGER ) - SUBGRID_BITS);

class Segment
{
	constructor(start, end, prev, dimension = 2, depth = 0)
	{
		this.start = start;
		this.end   = end;
		this.depth = depth;
		this.dimension = dimension;
		this.size  = 0;

		this.rectangles = new Set;
		this.subTree = depth < 1
			? new SMTree({dimension, [depthSymbol]: 1 + depth})
			: null;

		this.prev  = prev;
	}

	split(at)
	{
		if(at < this.start || at > this.end)
		{
			throw new RangeError('Splitting segment out of bounds!');
		}

		if(at === this.start)
		{
			return [this];
		}

		if(at === this.end)
		{
			return [this];
		}

		const a = new Segment(this.start, at, this.prev, this.dimension, this.depth);
		const b = new Segment(at, this.end, a, this.dimension, this.depth);

		for(const rectangle of this.rectangles)
		{
			const rectMin = this.depth === 0 ? rectangle.x1 : rectangle.y1;
			const rectMax = this.depth === 0 ? rectangle.x2 : rectangle.y2;

			if(rectMax < at)
			{
				a.add(rectangle);
				continue;
			}

			if(rectMin > at)
			{
				b.add(rectangle);
				continue;
			}

			a.add(rectangle);
			b.add(rectangle);
		}

		return [a, b];
	}

	add(rectangle)
	{
		this.rectangles.add(rectangle);
		this.size = this.rectangles.size;

		if(this.subTree)
		{
			this.subTree.add(rectangle);
		}
	}

	delete(rectangle)
	{
		this.rectangles.delete(rectangle);
		this.size = this.rectangles.size;

		if(this.subTree)
		{
			this.subTree.delete(rectangle);
		}

		const empty = (!this.rectangles.size) && this.start > -Infinity;

		return empty;
	}

	has(rectangle)
	{
		return this.rectangles.has(rectangle);
	}
}

const isRectangle = object => {
	return 'x1' in object
		&& 'y1' in object
		&& 'x2' in object
		&& 'y2' in object
		&& object.x1 < object.x2
		&& object.y1 < object.y2;
};

export class SMTree
{
	constructor(args = {dimension: 2, [depthSymbol]: 0})
	{
		this.depth = args[depthSymbol];
		this.dimension = args.dimension;
		this.segments = [new Segment(-Infinity, Infinity, null, this.dimension, this.depth)];
		this.rectangles = new WeakSet;
		this.snapshots = new WeakMap;
	}

	add(rectangle)
	{
		if(!isRectangle(rectangle))
		{
			throw new Error('Object supplied is not a Rectangle. Must have properties: x1, y1, x2, y2 where x1 < x2 && y1 < y2');
		}

		this.rectangles.add(rectangle);

		this.snapshots.set(rectangle, {
			x1: rectangle.x1,
			y1: rectangle.y1,
			x2: rectangle.x2,
			y2: rectangle.y2,
		});

		const rectMin = this.depth === 0 ? rectangle.x1 : rectangle.y1;
		const rectMax = this.depth === 0 ? rectangle.x2 : rectangle.y2;

		const startIndex = this.findSegment(rectMin);
		this.splitSegment(startIndex, rectMin);

		const endIndex = this.findSegment(rectMax);
		this.splitSegment(endIndex, rectMax);

		if(startIndex === endIndex)
		{
			this.segments[startIndex].add(rectangle);
			return;
		}

		for(let i = startIndex; i <= endIndex; i++)
		{
			if(this.segments[i].start >= rectMax || this.segments[i].end <= rectMin)
			{
				continue;
			}

			this.segments[i].add(rectangle);
		}
	}

	delete(rectangle)
	{
		if(!isRectangle(rectangle))
		{
			throw new Error('Object supplied is not a Rectangle. Must have properties: x1, y1, x2, y2.');
		}

		if(!this.rectangles.has(rectangle))
		{
			console.warn('Rectangle not in tree!');
			return false;
		}

		const snapshot = this.snapshots.get(rectangle);

		this.rectangles.delete(rectangle);
		this.snapshots.delete(rectangle);

		const rectMin = this.depth === 0 ? snapshot.x1 : snapshot.y1;
		const rectMax = this.depth === 0 ? snapshot.x2 : snapshot.y2;

		const startIndex = this.findSegment(rectMin);
		let endIndex = this.findSegment(rectMax);
		let deleteCount = 0;

		for(let i = startIndex; i <= endIndex; i++)
		{
			const segment = this.segments[i];
			const prev = this.segments[i - 1];
			const next = this.segments[i + 1];

			if(segment.has(rectangle))
			{
				segment.delete(rectangle);
				deleteCount++
			}

			if(segment.rectangles.size !== prev.rectangles.size)
			{
				continue;
			}

			if(segment.rectangles.symmetricDifference(prev.rectangles).size > 0)
			{
				continue;
			}

			prev.end = segment.end;

			if(next)
			{
				next.prev = prev;
			}

			this.segments.splice(i, 1);
			endIndex--;
			i--;
		}

		return deleteCount;
	}

	move(rectangle)
	{
		this.delete(rectangle);
		this.add(rectangle);
	}

	query(x1, y1, x2, y2)
	{
		const xStartIndex = this.findSegment(x1);
		const xEndIndex = this.findSegment(x2);

		let results = new Set;

		for(let i = xStartIndex; i <= xEndIndex; i++)
		{
			const segment = this.segments[i];

			if(!segment.subTree)
			{
				continue;
			}

			const yStartIndex = segment.subTree.findSegment(y1);
			const yEndIndex = segment.subTree.findSegment(y2);

			for(let j = yStartIndex; j <= yEndIndex; j++)
			{
				results = results.union(segment.subTree.segments[j].rectangles);
			}
		}

		return results;
	}

	queryLine(x1, y1, x2, y2)
	{
		if(x1 > x2) [x1, x2] = [x2, x1];
		if(y1 > y2) [y1, y2] = [y2, y1];

		const dx = x2 - x1;
		const dy = y2 - y1;
		const ror = dy / dx;
		const inv = dx / dy;

		let index = this.findSegment(x1);
		let xCurrent = x1;
		let yCurrent = y1;
		let rects = new Set;
		const results = new Map;

		do
		{
			const segment = this.segments[index];
			const xToEnd = Math.min(segment.end, x2) - xCurrent;
			xCurrent += xToEnd;
			yCurrent = Number.isFinite(ror) ? yCurrent + xToEnd * ror : y2
			index++;

			const subIndex = segment.subTree.findSegment(yCurrent);
			const subSegment = segment.subTree.segments[subIndex];

			rects = rects.union(subSegment.rectangles);
		}
		while(xCurrent < x2);

		for(const rect of rects)
		{
			let ax = Math.max(x1, rect.x1);
			let bx = Math.min(x2, rect.x2);
			let ay = Number.isFinite(ror) ? y1 + (ax - x1) * ror : Math.max(y1, rect.y1);
			let by = Number.isFinite(ror) ? y1 + (bx - x1) * ror : Math.min(y2, rect.y2);

			if(ay < rect.y1)
			{
				ax += (rect.y1 - ay) * inv;
				ay = rect.y1
			}

			if(by > rect.y2)
			{
				bx += (rect.y2 - by) * inv;
				by = rect.y2;
			}

			results.set(rect, [ax, ay, bx, by]);
		}

		return results;
	}

	splitSegment(index, at)
	{
		if(at <= this.segments[index].start || at >= this.segments[index].end)
		{
			return;
		}

		const splitSegments = this.segments[index].split(at);

		this.segments.splice(index, 1, ...splitSegments);
	}

	findSegment(at)
	{
		if(isNaN(at))
		{
			throw new Error('World.findSegment takes a number param.');
		}

		let lo = 0;
		let hi = -1 + this.segments.length;

		while(lo <= hi)
		{
			const current = Math.floor((lo + hi) * 0.5);
			const segment = this.segments[current];

			if(segment.start <= at && segment.end > at)
			{
				return current;
			}

			if(segment.start < at)
			{
				lo = 1 + current;
			}

			if(segment.end > at)
			{
				hi = -1 + current;
			}
		}

		return -1;
	}
}
