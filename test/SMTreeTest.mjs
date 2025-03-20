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

	for(let i = 0; i < 100; i++)
	{
		for(let j = 0; j < 100; j++)
		{
			const rect = new Rectangle(
				i * xSpace, j * ySpace
				, i * xSpace + xSize, j * ySpace + ySize
			);

			tree.add(rect);
			rects.push(rect);
		}
	}


	const fastStart = performance.now();

	const fastResult1   = tree.query(0,  0,  10,   10);
	const fastResult10  = tree.query(0,  0,  1000, 100);
	const fastResult25  = tree.query(0,  0,  500,  500);
	const fastResult100 = tree.query(0,  0,  1000, 1000);

	const fastTime = performance.now() - fastStart;


	assert(fastResult1.size === 1, 'fastResult1 should contain a single result.');
	assert(fastResult10.size === 10, 'fastResult10 should hold 10 results.');
	assert(fastResult25.size === 25, 'fastResult25 should hold 25 results.');
	assert(fastResult100.size === 100, 'fastResult100 should hold 100 results.');


	const slowStart = performance.now();

	const slowResult1   = fullScan(rects, 0,  0,  10,   10);
	const slowResult10  = fullScan(rects, 0,  0,  1000, 100);
	const slowResult25  = fullScan(rects, 0,  0,  500,  500);
	const slowResult100 = fullScan(rects, 0,  0,  1000, 1000);

	const slowTime = performance.now() - slowStart;


	assert(slowResult1.size === 1, 'slowResult1 should contain a single result.');
	assert(slowResult10.size === 10, 'slowResult10 should hold 10 results.');
	assert(slowResult25.size === 25, 'slowResult25 should hold 25 results.');
	assert(slowResult100.size === 100, 'slowResult100 should hold 100 results.');

	assert(fastTime < slowTime, 'SMTree expected to be faster than fullScan.');
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
				i * xSpace, j * ySpace
				, i * xSpace + xSize, j * ySpace + ySize
			);

			tree.add(rect);
			rects.push(rect);
		}
	}

	const fastStart = performance.now();

	const fastResult1   = tree.query(0, 0, 10,   10);
	const fastResult10  = tree.query(0, 0, 1000, 100);
	const fastResult25  = tree.query(0, 0, 500,  500);
	const fastResult100 = tree.query(0, 0, 1000, 1000);

	// fastResult10.forEach(r => console.log(r));

	const fastTime = performance.now() - fastStart;

	assert(fastResult1.size === 1, 'fastResult1 should contain a single result.');
	assert(fastResult10.size === 10, 'fastResult10 should hold 10 results.');
	assert(fastResult25.size === 25, 'fastResult25 should hold 25 results.');
	assert(fastResult100.size === 100, 'fastResult100 should hold 100 results.');

	const slowStart = performance.now();

	const slowResult1   = fullScan(rects, 0, 0, 10,   10);
	const slowResult10  = fullScan(rects, 0, 0, 1000, 100);
	const slowResult25  = fullScan(rects, 0, 0, 500,  500);
	const slowResult100 = fullScan(rects, 0, 0, 1000, 1000);

	const slowTime = performance.now() - slowStart;

	assert(slowResult1.size === 1, 'slowResult1 should contain a single result.');
	assert(slowResult10.size === 10, 'slowResult10 should hold 10 results.');
	assert(slowResult25.size === 25, 'slowResult25 should hold 25 results.');
	assert(slowResult100.size === 100, 'slowResult100 should hold 100 results.');

	assert(fastTime < slowTime, 'SMTree expected to be faster than fullScan.');
});
