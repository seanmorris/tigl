import test from 'node:test';
import assert from 'node:assert';

import { SMTree } from '../app/math/SMTree.js'
import { Rectangle } from '../app/math/Rectangle.js'
test('Pathological tiny query crosses many local slabs', () => {
	const tree = new SMTree;
	const count = 200;

	// Tiny query: 10x10
	const qx1 = 500;
	const qy1 = 500;
	const qx2 = 510;
	const qy2 = 510;

	// Create many distinct boundaries *inside* the tiny query window.
	// Each rectangle is still much larger than the query.
	for(let i = 0; i < count; i++)
	{
		const fx1 = qx1 + (i % 10);         // boundaries in [500, 509]
		const fx2 = qx1 + 1 + (i % 10);     // boundaries in [501, 510]

		const fy1 = qy1 + ((i / 10) | 0) % 10;
		const fy2 = qy1 + 1 + (((i / 10) | 0) % 10);

		tree.add(new Rectangle(
			fx1 - 500, // make rect much larger than query
			fy1 - 500,
			fx2 + 500,
			fy2 + 500
		));
	}

	const xStart = tree.findSegment(qx1);
	const xEnd   = tree.findSegment(qx2 - Number.EPSILON);

	// assert(
	// 	xEnd - xStart + 1 >= 10,
	// 	`SMTree should fragment the tiny query across many X slabs; got ${xEnd - xStart + 1}.`
	// );

	let maxYSlabsTouched = 0;

	for(let i = xStart; i <= xEnd; i++)
	{
		const subTree = tree.segments[i].subTree;
		const yStart = subTree.findSegment(qy1);
		const yEnd   = subTree.findSegment(qy2 - Number.EPSILON);

		maxYSlabsTouched = Math.max(maxYSlabsTouched, yEnd - yStart + 1);
	}

	// assert(
	// 	maxYSlabsTouched >= 10,
	// 	`SMTree should fragment the tiny query across many Y slabs; got ${maxYSlabsTouched}.`
	// );

	const result = tree.query(qx1, qy1, qx2, qy2);

	assert(
		result.size === count,
		`SMTree should return result with size ${count}, got ${result.size}.`
	);

	const t0 = performance.now();
	let total = 0;

	for(let i = 0; i < 200; i++)
	{
		total += tree.query(qx1, qy1, qx2, qy2).size;
	}

	const t1 = performance.now();

	assert(total === count * 200, 'SMTree repeated queries should return all rectangles.');

	console.log({
		count,
		xSegments: tree.segments.length,
		xSlabsTouched: xEnd - xStart + 1,
		maxYSlabsTouched,
		totalQueryMs: t1 - t0,
		avgQueryMs: (t1 - t0) / 200
	});
});