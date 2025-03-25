import test from 'node:test';
import assert from 'node:assert';

import { SMTree } from '../app/math/SMTree.js'
import { Rectangle } from '../app/math/Rectangle.js'

test('Can instantiate SMTree', () => {
	const tree = new SMTree;
});

test('Can add a Rectangle to SMTree', () => {
	const rect = new Rectangle(0, 0, 100, 100);
	const tree = new SMTree;
});

test('Can query an empty SMTree', () => {
	const tree = new SMTree;
	const result = tree.query(0, 0, 10, 10);
	assert(result.size === 0, 'Empty SMTree should return result with zero size.');
});

test('Can query an nonempty SMTree', () => {
	const tree = new SMTree;
	tree.add(new Rectangle(0, 0, 100, 100));
	tree.query(0, 0, 10, 10);

	const result = tree.query(0, 0, 10, 10);
	assert(result.size === 1, 'SMTree should return result with size 1.');
});

test('Can find two non overlapping rects in a field', () => {
	const tree = new SMTree;
	const a = new Rectangle(-100, -100, -10, 100)
	const b = new Rectangle(10, -100, 100, 100)

	tree.add(b);
	tree.add(a);

	const result0 = tree.query(0, 0, 5, 5);
	const resultA = tree.query(-50, -5, -40, 5);
	const resultB = tree.query(50, -5, 40, 5);

	assert(result0.size === 0, 'SMTree should return result with size 0.');
	assert(resultA.size === 1, 'SMTree should return result with size 1.');
	assert(resultB.size === 1, 'SMTree should return result with size 1.');

	tree.delete(a);

	const resultA2 = tree.query(-50, -5, -40, 5);
	const resultB2 = tree.query(50, -5, 40, 5);
	assert(resultA2.size === 0, 'SMTree should return result with size 0.');
	assert(resultB2.size === 1, 'SMTree should return result with size 1.');

	tree.delete(b);

	const resultA3 = tree.query(-50, -5, -40, 5);
	const resultB3 = tree.query(50, -5, 40, 5);
	assert(resultA3.size === 0, 'SMTree should return result with size 1.');
	assert(resultB3.size === 0, 'SMTree should return result with size 0.');
});

test('Can find two overlapping rects in a field', () => {
	const tree = new SMTree;
	const a = new Rectangle(-100, -100, 10, 100)
	const b = new Rectangle(-10, -100, 100, 100)

	tree.add(b);
	tree.add(a);

	const resultA = tree.query(-50, -5, -40, 5);
	const resultB = tree.query(50, -5, 40, 5);

	assert(resultA.size === 1, 'SMTree should return result with size 1.');
	assert(resultB.size === 1, 'SMTree should return result with size 1.');

	tree.delete(a);

	const resultA2 = tree.query(-50, -5, -40, 5);
	const resultB2 = tree.query(50, -5, 40, 5);
	assert(resultA2.size === 0, 'SMTree should return result with size 0.');
	assert(resultB2.size === 1, 'SMTree should return result with size 1.');

	tree.delete(b);

	const resultA3 = tree.query(-50, -5, -40, 5);
	const resultB3 = tree.query(50, -5, 40, 5);
	assert(resultA3.size === 0, 'SMTree should return result with size 1.');
	assert(resultB3.size === 0, 'SMTree should return result with size 0.');
});

const fullScan = (rects, x1, y1, x2, y2) => {
	const searchRect = new Rectangle(x1, y1, x2, y2);
	const result = new Set;
	for(const rect of rects)
	{
		if(searchRect.isOverlapping(rect))
		{
			result.add(rect);
		}
	}
	return result;
};

test('Can find non-overlapping rects in a field', () => {
	const xSize = 10;
	const ySize = 10;
	const xSpace = 100;
	const ySpace = 100;

	const rects = [];

	const tree = new SMTree;

	let last;

	for(let i = 0; i < 100; i++)
	{
		for(let j = 0; j < 100; j++)
		{
			const rect = new Rectangle(
				i * xSpace
				, j * ySpace
				, i * xSpace + xSize
				, j * ySpace + ySize
			);

			tree.add(rect);
			rects.push(rect);
			last = rect;
		}
	}

	const fastStart = performance.now();

	const fastResult1   = tree.query(0,  0,  10,  10);
	const fastResult10  = tree.query(0,  0,  999, 10);
	const fastResult25  = tree.query(0,  0,  499, 499);
	const fastResult100 = tree.query(0,  0,  999, 999);

	const fastTime = performance.now() - fastStart;

	const slowStart = performance.now();

	const slowResult1   = fullScan(rects, 0,  0,  10,  10);
	const slowResult10  = fullScan(rects, 0,  0,  999, 10);
	const slowResult25  = fullScan(rects, 0,  0,  499, 499);
	const slowResult100 = fullScan(rects, 0,  0,  999, 999);

	const slowTime = performance.now() - slowStart;

	assert(slowResult1.size === 1, 'slowResult1 should contain a single result.');
	assert(slowResult10.size === 10, 'slowResult10 should hold 10 results.');
	assert(slowResult25.size === 25, 'slowResult25 should hold 25 results.');
	assert(slowResult100.size === 100, 'slowResult100 should hold 100 results.');

	assert(fastResult1.size === 1, 'fastResult1 should contain a single result.');
	assert(fastResult10.size === 10, 'fastResult10 should hold 10 results.');
	assert(fastResult25.size === 25, 'fastResult25 should hold 25 results.');
	assert(fastResult100.size === 100, 'fastResult100 should hold 100 results.');

	assert(fastTime < slowTime, 'SMTree expected to be faster than fullScan.');

	const moves = [
		-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1
		, -640, -640, -640, -640, -640, -640, -640, -640, -640, -640
		, -32, -32, -32, -32, -32, -32, -32, -32
	];

	for(const move of moves)
	{
		const s = performance.now();
		last.x1 += move;
		last.x2 += move;
		tree.delete(last);
		tree.add(last);
		const time = performance.now() - s;
		console.log({move, time});
	}
});

test('Can find overlapping rects in a field', () => {
	const xSize = 200;
	const ySize = 200;
	const xSpace = 100;
	const ySpace = 100;

	const rects = [];

	const tree = new SMTree;

	for(let i = 0; i < 1000; i++)
	{
		for(let j = 0; j < 1000; j++)
		{
			const rect = new Rectangle(
				i * xSpace
				, j * ySpace
				, i * xSpace + xSize
				, j * ySpace + ySize
			);

			tree.add(rect);
			rects.push(rect);
		}
	}

	const fastStart = performance.now();

	const fastResult1   = tree.query(0, 0, 10,   10);
	const fastResult10  = tree.query(0, 0, 1000, 10);
	const fastResult25  = tree.query(0, 0, 500,  500);
	const fastResult100 = tree.query(0, 0, 1000, 1000);

	const fastTime = performance.now() - fastStart;

	assert(fastResult1.size === 1, 'fastResult1 should contain a single result.');
	assert(fastResult10.size === 10, 'fastResult10 should hold 10 results.');
	assert(fastResult25.size === 25, 'fastResult25 should hold 25 results.');
	assert(fastResult100.size === 100, 'fastResult100 should hold 100 results.');

	const slowStart = performance.now();

	const slowResult1   = fullScan(rects, 0, 0, 10,   10);
	const slowResult10  = fullScan(rects, 0, 0, 1000, 10);
	const slowResult25  = fullScan(rects, 0, 0, 500,  500);
	const slowResult100 = fullScan(rects, 0, 0, 1000, 1000);

	const slowTime = performance.now() - slowStart;

	assert(slowResult1.size === 1, 'slowResult1 should contain a single result.');
	assert(slowResult10.size === 10, 'slowResult10 should hold 10 results.');
	assert(slowResult25.size === 25, 'slowResult25 should hold 25 results.');
	assert(slowResult100.size === 100, 'slowResult100 should hold 100 results.');

	assert(fastTime < slowTime, 'SMTree expected to be faster than fullScan.');
});
