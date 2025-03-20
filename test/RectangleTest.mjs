import test from 'node:test';
import assert from 'node:assert';

import { Rectangle } from '../app/math/Rectangle.js';

test('Can instantiate a Rectangle', () => {
	new Rectangle;
});

test('Rectangle contains point', () => {
	const r = new Rectangle(0, 0, 100, 100);

	assert(r.contains(50, 50), 'Point 50, 50 is inside rectangle.');
	assert(!r.contains(150, 150), 'Point 150, 150 is inside rectangle.');
});

test('Rectangle overlaps another Rectangle', () => {
	const r1 = new Rectangle(-10, -10, 5, 5);
	const r2 = new Rectangle(-5, -5, 10, 10);
	const r3 = new Rectangle(50, 50, 100, 100);

	assert(r1.isOverlapping(r2), 'R1 expected to overlap R2.');
	assert(r2.isOverlapping(r1), 'R2 expected to overlap R1.');

	assert(!r1.isOverlapping(r3), 'R1 not expected to overlap R3.');
	assert(!r2.isOverlapping(r3), 'R2 not expected to overlap R3.');

	assert(!r3.isOverlapping(r1), 'R3 not expected to overlap R1.');
	assert(!r3.isOverlapping(r2), 'R3 not expected to overlap R2.');
});

test('Rectangle is flush with another Rectangle', () => {
	const r1 = new Rectangle(-5, -5,  5, 5);

	const r2 = new Rectangle( 5,  0, 10, 5);
	const r3 = new Rectangle( -5, 5, -5, 10);

	const rA = new Rectangle(50, 50, 100, 100);
	const rB = new Rectangle( 0,  0, 100, 100);

	assert(r1.isFlushWith(r2), 'R1 expected to be flush with R2.');
	assert(r2.isFlushWith(r1), 'R2 expected to be flush with R1.');

	assert(r1.isFlushWith(r3), 'R1 expected to be flush with R3.');
	assert(r3.isFlushWith(r1), 'R3 expected to be flush with R1.');


	assert(!r1.isFlushWith(rA), 'R1 not expected to be flush with RA.');
	assert(!r2.isFlushWith(rA), 'R2 not expected to be flush with RA.');

	assert(!rA.isFlushWith(r1), 'RA not expected to be flush with R1.');
	assert(!rA.isFlushWith(r2), 'RA not expected to be flush with R2.');


	assert(!r1.isFlushWith(rB), 'R1 not expected to be flush with RB.');
	assert(!r2.isFlushWith(rB), 'R2 not expected to be flush with RB.');

	assert(!rB.isFlushWith(r1), 'RB not expected to be flush with R1.');
	assert(!rB.isFlushWith(r2), 'RB not expected to be flush with R2.');
});

test('Rectangle intersects another Rectangle', () => {
	const r1 = new Rectangle(-10, -10, 5, 5);
	const r2 = new Rectangle(-5, -5, 10, 10);

	const i1 = r1.intersection(r2);
	const i2 = r2.intersection(r1);

	assert(r1.isOverlapping(r2), 'R1 expected to overlap R2.');
	assert(r2.isOverlapping(r1), 'R2 expected to overlap R1.');

	assert(i1.x1 === -5, 'Intersection 1, x1 expected to be -5');
	assert(i1.y1 === -5, 'Intersection 1, y1 expected to be -5');
	assert(i1.x2 === +5, 'Intersection 1, x2 expected to be +5');
	assert(i1.y2 === +5, 'Intersection 1, y2 expected to be +5');

	assert(i2.x1 === -5, 'Intersection 2, x1 expected to -5');
	assert(i2.y1 === -5, 'Intersection 2, y1 expected to -5');
	assert(i2.x2 === +5, 'Intersection 2, x2 expected to +5');
	assert(i2.y2 === +5, 'Intersection 2, y2 expected to +5');
});

test('Rectangle is completely inside another Rectangle', () => {
	const outer = new Rectangle(-10, -10, 10, 10);
	const inner = new Rectangle(-5, -5, 5, 5);

	assert(inner.isInside(outer), 'inner is inside of outer.');
	assert(outer.isOutside(inner), 'outer is outside of inner.');
});
