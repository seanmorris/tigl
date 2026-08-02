/**
 * @import { Rectangle } from "./Rectangle";
 */

import { Geometry } from "./Geometry.js";

const depthSymbol = Symbol('depth');

const SUBGRID_BITS = 8;
const SUBGRID_SIZE = 1 << SUBGRID_BITS;
const SUBGRID_INVR = 1 / SUBGRID_SIZE;
const MAX_GRID_IDX = 2 ** (Math.log2( 1 + Number.MAX_SAFE_INTEGER ) - SUBGRID_BITS);

/**
 * @typedef {{
 *   x1: number,
 *   y1: number,
 *   x2: number,
 *   y2: number,
 * }} RectangleLike
 */

/**
 * @typedef {{
 *   x1: number,
 *   y1: number,
 *   x2: number,
 *   y2: number,
 * }} LineLike
 */


/**
 * Represents a Segment of an SMTree
 */
class Segment
{
	/**
	 *
	 * @param {number} start - Where the segment starts
	 * @param {number} end - Where the segment ends
	 * @param {Segment|null} prev - Reference to the previous segment in the SMTree
	 * @param {number} dimension - Number of dimensions in the SMTree
	 * @param {number} depth - Depth (dimension) of this Segmment
	 */
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

	/**
	 * Split a Segment into two Segments
	 * @param {number} at - The point to split at
	 * @returns {Array<Segment>} - An array containing the Segments that replaced this one (or the current Segment if not split)
	 */
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

	/**
	 * Add a RectangleLike to the Segment
	 * @param {RectangleLike} rectangle - The RectangleLike to add
	 */
	add(rectangle)
	{
		this.rectangles.add(rectangle);
		this.size = this.rectangles.size;

		if(this.subTree)
		{
			this.subTree.add(rectangle);
		}
	}

	/**
	 * Remove a RectangleLike from the Segment
	 * @param {RectangleLike} rectangle - The RectangleLike to remove
	 * @returns {boolean} - Whether the Segment is empty after the delete
	 */
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

	/**
	 * Check if a RectangleLike is in the Segment
	 * @param {RectangleLike} rectangle - The RectangleLike to check
	 * @returns {boolean}
	 */
	has(rectangle)
	{
		return this.rectangles.has(rectangle);
	}
}

/**
 * Test if a given object is rectangle-like
 * @param {RectangleLike|any} object - The object to test
 * @returns {boolean} - True if the object can be treated as a Rectangle
 */
const isRectangle = object => {
	return 'x1' in object
		&& 'y1' in object
		&& 'x2' in object
		&& 'y2' in object
		&& object.x1 < object.x2
		&& object.y1 < object.y2;
};

/**
 * Represent a Segment Mapping Tree
 */
export class SMTree
{
	/**
	 * Construct an SMTree Object
	 * @param {object} args - Named param
	 * @propperty {number} dimension - The number of dimensions in the tree
	 * @propperty {number} [depthSymbol] - The depth of the layer
	 */
	constructor(args = {dimension: 2, [depthSymbol]: 0})
	{
		this.depth = args[depthSymbol];
		this.dimension = args.dimension;
		this.segments = [new Segment(-Infinity, Infinity, null, this.dimension, this.depth)];
		this.rectangles = new WeakSet;
		this.snapshots = new WeakMap;
	}

	/**
	 * Add a RectangleLike to the SMTree
	 * @param {RectangleLike} rectangle - The RectangleLike to add
	 * @returns {void}
	 */
	add(rectangle)
	{
		if(!isRectangle(rectangle))
		{
			throw new Error('Object supplied is not a Rectangle. Must have properties: x1, y1, x2, y2 where x1 < x2 && y1 < y2');
		}

		this.rectangles.add(rectangle);

		this.snapshots.set(rectangle, {
			x1: rectangle.x1
			, y1: rectangle.y1
			, x2: rectangle.x2
			, y2: rectangle.y2
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

	/**
	 * Remove a RectangleLike from the SMTree
	 * @param {RectangleLike} rectangle - The RectangleLike to remove
	 * @returns {false|number} - The number of Segments removed / false if RectangleLike is not in SMTree
	 */
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
				deleteCount++;
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

	/**
	 * Move a RectangleLike in the SMTree
	 * @param {RectangleLike} rectangle - The RectangleLike to move
	 */
	move(rectangle)
	{
		this.delete(rectangle);
		this.add(rectangle);
	}

	/**
	 * Find a set of RectangleLikes in the SMTree by a given rectangle
	 * @param {number} x1 - The x value of the top/left
	 * @param {number} y1 - The y value of the top/left
	 * @param {number} x2 - The x value of the bottom/right
	 * @param {number} y2 - The y value of the bottom/right
	 * @returns {Set<RectangleLike>} - Set of RectangleLikes overlapping the given rectangle
	 */
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


	/**
	 * Find a set of RectangleLikes in the SMTree by a given line
	 * @param {number} x1 - The x value of the start point
	 * @param {number} y1 - The y value of the start point
	 * @param {number} x2 - The x value of the end point
	 * @param {number} y2 - The y value of the end point
	 * @returns {Map<RectangleLike,[number, number, number, number]>} - Mao of RectangleLikes overlapping the given rectangle to LineLikes inscribing RectangleLikes clipped to the given rectangle
	 */
	queryLine(x1, y1, x2, y2)
	{
		const dx = x2 - x1;
		const dy = y2 - y1;

		const ror = dy / dx;

		let startSegment = this.findSegment(x1);
		let endSegment = this.findSegment(x2);

		/** @type {Set<Rectangle>} */
		let rects = new Set;
		const results = new Map;

		const xDir = Math.sign(x2 - x1) || 1;
		const yDir = Math.sign(y2 - y1) || 1;

		const xCrossings = [x1];
		const yCrossings = [y1];

		for(let i = startSegment; i != endSegment + xDir; i += xDir)
		{
			const xc = xDir > 0 ? this.segments[i].end : this.segments[i].start;

			if(!isFinite(xc)) break;

			const yc = y1 + dy * (dx ? ((xc - x1) / dx) : 0);

			xCrossings.push(xc);
			yCrossings.push(yc);
		}

		for(let i = 0; i < xCrossings.length -1; i++)
		{
			const index = this.findSegment(xCrossings[i] + 0.0001 * Math.sign(dx));
			const segment = this.segments[index];

			const subIndexStart = segment.subTree.findSegment(yCrossings[i]);
			const subIndexEnd = segment.subTree.findSegment(yCrossings[i + 1]);

			let j = subIndexStart;

			do
			{
				const subSegment = segment.subTree.segments[j];

				rects = rects.union(subSegment.rectangles);

				if(j === subIndexEnd) break;

				j += yDir;
			}
			while(j != subIndexEnd);
		}

		for(const rect of rects)
		{
			const lines = rect.toLines();

			let near = rect.contains(x1, y1) ? [x1, y1, 0] : null;
			let far = rect.contains(x2, y2) ? [x2, y2, 1] : null;

			if(!near || !far)
			for(let i = 0; i < 16; i += 4)
			{
				const [x1b, y1b, x2b, y2b] = lines.slice(i, i + 4);

				const intersection = Geometry.lineIntersectsLine(
					x1, y1, x2, y2, x1b, y1b, x2b, y2b
				);

				if(intersection)
				{
					if(!near || near[2] > intersection[2])
					{
						if(near) far = near;
						near = intersection;
					}
					else if(!far || far[2] > intersection[2])
					{
						far = intersection;
					}
				}
			}

			if(near || far)
			results.set(rect, [near[0], near[1], far[0], far[1]]);
		}

		return results;
	}

	/**
	 * Split a Segment into two Segments
	 * @param {number} index - The index of the Segment to split
	 * @param {number} at - The point to split at
	 * @returns {void}
	 */
	splitSegment(index, at)
	{
		if(at <= this.segments[index].start || at >= this.segments[index].end)
		{
			return;
		}

		const splitSegments = this.segments[index].split(at);

		this.segments.splice(index, 1, ...splitSegments);
	}

	/**
	 * Find the segment occupying a given point
	 * @param {number} at - The point to search by
	 * @returns {number} - The index of the new segment, -1 if not found
	 */
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
