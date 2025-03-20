class Segment
{
	constructor(start, end, prev, depth = 0)
	{
		this.start = start;
		this.end   = end;
		this.depth = depth;
		this.size  = 0;

		this.rectangles = new Set;
		this.subTree = depth < 1
			? new SMTree(1 + depth)
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

		const a = new Segment(this.start, at, this.prev, this.depth);
		const b = new Segment(at, this.end, a, this.depth);

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
		Object.freeze(rectangle);

		if(this.subTree)
		{
			this.subTree.add(rectangle);
		}

		this.rectangles.add(rectangle);
		this.size = this.rectangles.size;
	}

	delete(rectangle)
	{
		if(this.subTree)
		{
			this.subTree.delete(rectangle);
		}

		this.rectangles.delete(rectangle);
		this.size = this.rectangles.size;

		const empty = (!this.rectangles.size) && this.start > -Infinity;

		return empty;
	}
}

const isRectangle = (object) => {
	return 'x1' in object
		&& 'y1' in object
		&& 'x2' in object
		&& 'y2' in object;
};

export class SMTree
{
	constructor(depth = 0)
	{
		this.depth = depth;
		this.segments = [new Segment(-Infinity, Infinity, null, this.depth)];
	}

	add(rectangle)
	{
		if(!isRectangle(rectangle))
		{
			throw new Error('Object supplied is not a Rectangle. Must have properties: x1, y1, x2, y1.');
		}

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

		for(let i = 1 + startIndex; i <= endIndex; i++)
		{
			this.segments[i].add(rectangle);
		}
	}

	delete(rectangle)
	{
		if(!isRectangle(rectangle))
		{
			throw new Error('Object supplied is not a Rectangle. Must have properties: x1, y1, x2, y1.');
		}

		const rectMin = this.depth === 0 ? rectangle.x1 : rectangle.y1;
		const rectMax = this.depth === 0 ? rectangle.x2 : rectangle.y2;

		const startIndex = this.findSegment(rectMin);
		const endIndex = this.findSegment(rectMax);

		const empty = [];

		for(let i = startIndex; i <= endIndex; i++)
		{
			if(this.segments[i].delete(rectangle))
			{
				empty.push(i);
			}
		}

		for(let i = -1 + empty.length; i >= 0; i--)
		{
			const e = empty[i];

			if(!this.segments[-1 + e])
			{
				throw new Error('Cannot delete segment without predecessor.')
			}

			this.segments[-1 + e].end = this.segments[e].end;
			this.segments[1 + e].prev = this.segments[-1 + e];
			this.segments.splice(e, 1);
		}

		if(this.segments.length === 2 && this.segments[0].size == 0 && this.segments[1].size === 0)
		{
			this.segments[0].end = this.segments[1].end;
			this.segments.length = 1;
		}
	}

	query(x1, y1, x2, y2)
	{
		const results = new Set;

		const xStartIndex = this.findSegment(x1);
		const xEndIndex = this.findSegment(x2);

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
				for(const result of segment.subTree.segments[j].rectangles)
				{
					results.add(result)
				}
			}
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
		let lo = 0;
		let hi = -1 + this.segments.length;

		do
		{
			const current = Math.floor((lo + hi) * 0.5);
			const segment = this.segments[current];

			if(segment.start < at && segment.end >= at)
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
		} while(lo <= hi);

		return -1;
	}
}
