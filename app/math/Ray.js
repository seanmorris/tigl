import { Entity } from "../model/Entity.js";
import { Geometry } from "./Geometry.js";

/**
 * @import { TileMap } from "../world/TileMap";
 * @import { World } from "../world/World";
 */

/**
 * @typedef {[number, number, number, number, TileMap]} TerrainPoint
 * @typedef {[number, number, number]} EntityPoint
 * @typedef {TerrainPoint|Set<TerrainPoint>|number|null} TerrainScanResult
 * @typedef {Map<Entity,EntityPoint>} EntityScanResult
 * @typedef {{
 *   terrain: TerrainScanResult,
 *   entities: EntityScanResult,
 *   hit: boolean,
 *   d: number,
 *   x?: number,
 *   y?: number,
 *   t?: number,
 *   layerId?: number
 * }} RaycastResult
 */

const SUBGRID_BITS = 8;
const SUBGRID_SIZE = 1 << SUBGRID_BITS;
const SUBGRID_INVR = 1 / SUBGRID_SIZE;
const MAX_GRID_IDX = 2 ** (Math.log2( 1 + Number.MAX_SAFE_INTEGER ) - SUBGRID_BITS);

/** @type {(subb: number, pred: number) => number} */
const mod = (subj, pred) => ((subj % pred) + pred) % pred;

/**
 * Static class for casting rays
 */
export class Ray
{
	/**
	 * @property {number} T_LAST_EMPTY - Return the last empty pixel instead of the collision
	 */
	static T_LAST_EMPTY = 0b0000_0001;

	/**
	 * @property {number} T_ALL_POINTS - Return all points scanned rather than the nearest
	 */
	static T_ALL_POINTS = 0b0000_0010;

	/**
	 * @property {number} T_ALL_SOLID_POINTS - Return all solid points rather than the nearest
	 */
	static T_ALL_SOLID_POINTS = 0b0000_0100;

	/**
	 * @property {number} T_SNAP_TO_INT - Snap the return point to the edge of the pixel
	 */
	static T_SNAP_TO_INT = 0b0000_1000;

	/**
	 * @property {number} T_GET_LENGTH - Return the length of the ray instead of the point
	 */
	static T_GET_LENGTH = 0b0001_0000;

	/**
	 * @property {number} E_NO_MINK - Disable Minkowski expansion for entity raycasts
	 */
	static E_NO_MINK = 0b0010_0000;

	/**
	 * @property {number} E_SOLID - Only scan for solid/platform entities
	 */
	static E_SOLID = 0b0100_0000;

	/**
	 * @property {number} DEFAULT_FLAGS - Default flags when param is not supplied.
	 */
	static DEFAULT_FLAGS = 0b0000_0000;

	// /**
	//  * @property {number} E_ALL_ENTITIES - ...
	//  */
	// static E_ALL_ENTITIES = 0b0000_0001_0000_0000;

	/**
	 *
	 * @param {World} world - The world to scan
	 * @param {number} startX - The x value of the start point
	 * @param {number} startY - The y value of the start point
	 * @param {number} endX - The x value of the end point
	 * @param {number} endY - The y value of the end point
	 * @param {number} rayFlags - flags to affect raycast behavior
	 * @param {number} layerId - The id of the layer to scan
	 * @param {Entity|null} castingEntity - The Entity casting the ray
	 * @returns {RaycastResult} - The result of the raycast
	 */
	static cast(world, startX, startY, endX, endY, rayFlags = this.DEFAULT_FLAGS, layerId = 0, castingEntity = null)
	{
		const dx = endX - startX;
		const dy = endY - startY;

		const hypot = Math.hypot(dy, dx);

		const cos = dx / hypot;
		const sin = dy / hypot;

		const terrain = this.castTerrain(world, startX, startY, endX, endY, rayFlags, layerId);
		const entities = this.castEntity(world, startX, startY, endX, endY, rayFlags & this.E_NO_MINK, castingEntity);

		let hit = false;

		/** @type {TerrainScanResult|EntityPoint} */
		let nearest = terrain;
		let minDist = Infinity;

		if(rayFlags & (this.T_ALL_POINTS | this.T_ALL_SOLID_POINTS) && terrain instanceof Set)
		{
			for(const point of terrain)
			{
				const dist = Math.hypot(startY - point[1], startX - point[0]);

				if(dist < minDist)
				{
					nearest = point;
					minDist = dist;
				}
			}
		}
		else if(rayFlags & this.T_GET_LENGTH && typeof terrain === 'number')
		{
			nearest = [cos * terrain, sin * terrain, terrain/hypot];
			minDist = Math.hypot(startY - nearest[1], startX - nearest[0]);
		}
		else if(terrain)
		{
			minDist = Math.hypot(startY - nearest[1], startX - nearest[0]);
			hit = true;
		}

		for(const [entity, point] of entities.entries())
		{
			const dist = Math.hypot(startY - point[1], startX - point[0]);

			if(!(entity.flags & Entity.E_SOLID) && !(entity.flags & Entity.E_PLATFORM))
			{
				continue;
			}

			if(entity.flags & Entity.E_PLATFORM)
			{
				if(startY > endY)
				{
					continue;
				}

				const entityTop = entity.y + -entity.height;

				if(castingEntity && castingEntity.y > entityTop + 16)
				{
					continue;
				}
			}

			if(dist < minDist)
			{
				nearest = point;
				minDist = dist;
				hit = true;
			}
		}

		if(nearest && typeof nearest === 'object')
		{
			return {
				terrain,
				entities,
				x: nearest[0],
				y: nearest[1],
				hit,
				t: nearest[2],
				d: minDist,
				layerId: nearest[3],
				...nearest
			};
		}

		return {terrain, entities, hit, d: Number.isFinite(minDist) ? minDist : hypot};

	}

	/**
	 * Scan for entities in the world
	 * @param {World} world - The world to scan
	 * @param {number} startX - The x value of the start point
	 * @param {number} startY - The y value of the start point
	 * @param {number} endX - The x value of the end point
	 * @param {number} endY - The y value of the end point
	 * @param {number} rayFlags - flags to affect raycast behavior
	 * @param {Entity|null} castingEntity - The Entity casting the ray
	 * @returns {EntityScanResult} - The result of the raycast
	 */
	static castEntity(world, startX, startY, endX, endY, rayFlags = this.DEFAULT_FLAGS, castingEntity = null)
	{
		const centerX = (startX + endX) * 0.5;
		const centerY = (startY + endY) * 0.5;

		const sizeX = Math.max(320, Math.abs(startX - endX));
		const sizeY = Math.max(320, Math.abs(startY - endY));

		const candidates = world.getEntitiesForRect(centerX, centerY, sizeX, sizeY);
		const collisions = new Map;

		for(const candidate of candidates)
		{
			if(candidate === castingEntity)
			{
				continue;
			}

			if(rayFlags & this.E_SOLID)
			{
				if(!(candidate.flags & Entity.E_SOLID) && !(candidate.flags & Entity.E_PLATFORM))
				{
					continue;
				}

				if(candidate.flags & Entity.E_PLATFORM && !(rayFlags & this.E_SOLID))
				{
					if(startY > endY)
					{
						continue;
					}

					const candidateTop = candidate.y + -candidate.height;

					if(castingEntity && castingEntity.y > candidateTop + 16)
					{
						continue;
					}
				}
			}

			let rect = candidate.rect;

			if(castingEntity && !(rayFlags & this.E_NO_MINK))
			{
				rect = rect.expand(castingEntity.rect);
			}

			if(rect.contains(startX, startY))
			{
				collisions.set(candidate, [startX, startY, 0, 0]);
				continue;
			}

			const points = rect.toLines();

			for(let i = 0; i < points.length; i += 4)
			{
				const x1 = points[i + 0];
				const y1 = points[i + 1];
				const x2 = points[i + 2];
				const y2 = points[i + 3];

				const intersection = Geometry.lineIntersectsLine(
					startX, startY, endX, endY, x1, y1, x2, y2
				);

				if(intersection)
				{
					if(collisions.has(candidate))
					{
						const existing = collisions.get(candidate);

						if(intersection[2] < existing[2])
						{
							collisions.set(candidate, intersection);
						}
					}
					else
					{
						collisions.set(candidate, intersection);
					}
				}
			}
		}

		return collisions;
	}

	/**
	 * Scan for terrain along a ray
	 * @param {World} world - The world to scan
	 * @param {number} startX - The x value of the start point
	 * @param {number} startY - The y value of the start point
	 * @param {number} endX - The x value of the end point
	 * @param {number} endY - The y value of the end point
	 * @param {number} rayFlags - flags to affect raycast behavior
	 * @param {number} layerId - The id of the layer to scan
	 * @returns {TerrainScanResult} - The nearest point, all points, or length, depending on rayFlags
	 */
	static castTerrain(world, startX, startY, endX, endY, rayFlags = this.DEFAULT_FLAGS, layerId = 0)
	{
		/** @type Set<TerrainPoint> */
		let pointsSet = new Set();
		const mapSegments = world.mapTree.queryLine(startX, startY, endX, endY);

		for(const [rect, segment] of mapSegments)
		{
			const map = world.rectMap.get(rect);
			pointsSet = pointsSet.union(this.castTerrainInMap(map, ...segment, rayFlags, layerId));
		}

		if(rayFlags & (this.T_ALL_POINTS | this.T_ALL_SOLID_POINTS))
		{
			return pointsSet;
		}

		/** @type TerrainPoint[] */
		const points = [...pointsSet];

		const distSquares = new Array(points.length);

		const qStartX = Math.trunc(startX * SUBGRID_SIZE) * SUBGRID_INVR;
		const qStartY = Math.trunc(startY * SUBGRID_SIZE) * SUBGRID_INVR;

		const qEndX = Math.trunc(endX * SUBGRID_SIZE) * SUBGRID_INVR;
		const qEndY = Math.trunc(endY * SUBGRID_SIZE) * SUBGRID_INVR;

		for(const p in points)
		{
			distSquares[p] = (points[p][0] - qStartX) ** 2 + (points[p][1] - qStartY) **2
		}

		const minDistSq = Math.min(...distSquares);
		const nearest = points[ distSquares.indexOf(minDistSq) ];

		const dx = qEndX - qStartX;
		const dy = qEndY - qStartY;

		const hypot = Math.hypot(dy, dx);

		const sx = dx ? hypot / dx : 0;
		const sy = dy ? hypot / dy : 0;

		if(Math.sqrt(minDistSq) > hypot)
		{
			return null;
		}

		if(nearest)
		{
			if(rayFlags & this.T_LAST_EMPTY)
			{
				const cos = hypot ? dx / hypot : 0;
				const sin = hypot ? dy / hypot : 0;

				nearest[0] += -cos;
				nearest[1] += -sin;
			}

			if(rayFlags & this.T_GET_LENGTH)
			{
				return Math.hypot(qStartX - nearest[0], qStartY - nearest[1]);
			}

			return nearest;
		}

		return null;
	}

	/**
	 * Scan for terrain in a map
	 * @param {TileMap} tileMap - The TileMap to scan
	 * @param {number} startX - The x value of the start point
	 * @param {number} startY - The y value of the start point
	 * @param {number} endX - The x value of the end point
	 * @param {number} endY - The y value of the end point
	 * @param {number} rayFlags - flags to affect raycast behavior
	 * @param {number} layerId - The id of the layer to scan
	 * @returns {Set<TerrainPoint>} - The result of the raycast
	 */
	static castTerrainInMap(tileMap, startX, startY, endX, endY, rayFlags, layerId = 0)
	{
		if(-MAX_GRID_IDX > startX || startX >= MAX_GRID_IDX ) throw new Error(`startX must be within [${-MAX_GRID_IDX}, ${MAX_GRID_IDX})`);
		if(-MAX_GRID_IDX > startY || startY >= MAX_GRID_IDX ) throw new Error(`startY must be within [${-MAX_GRID_IDX}, ${MAX_GRID_IDX})`);
		if(-MAX_GRID_IDX > endX || endX >= MAX_GRID_IDX ) throw new Error(`endX must be within [${-MAX_GRID_IDX}, ${MAX_GRID_IDX})`);
		if(-MAX_GRID_IDX > endY || endY >= MAX_GRID_IDX ) throw new Error(`endY must be within [${-MAX_GRID_IDX}, ${MAX_GRID_IDX})`);

		const qStartX = Math.trunc(startX * SUBGRID_SIZE) * SUBGRID_INVR;
		const qStartY = Math.trunc(startY * SUBGRID_SIZE) * SUBGRID_INVR;

		const qEndX = Math.trunc(endX * SUBGRID_SIZE) * SUBGRID_INVR;
		const qEndY = Math.trunc(endY * SUBGRID_SIZE) * SUBGRID_INVR;

		const xOff = Math.trunc(mod(tileMap.x, tileMap.tileWidth) * SUBGRID_SIZE) * SUBGRID_INVR;
		const yOff = Math.trunc(mod(tileMap.y, tileMap.tileHeight) * SUBGRID_SIZE) * SUBGRID_INVR;

		const startTile = tileMap.getCollisionTile(qStartX, qStartY, layerId);

		const dx = qEndX - qStartX;
		const dy = qEndY - qStartY;

		const hypot = Math.hypot(dy, dx);

		const sx = dx ? hypot / dx : 0;
		const sy = dy ? hypot / dy : 0;

		const ox = Math.sign(dx);
		const oy = Math.sign(dy);

		if(startTile && tileMap.getSolid(qStartX, qStartY, layerId))
		{
			if(hypot === 0)
			{
				return new Set([ [qStartX, qStartY, 0, layerId, tileMap] ]);
			}

			let px = qStartX;
			let py = qStartY;

			const lx = px - tileMap.x;
			const ly = py  - tileMap.y;

			const bl = tileMap.x + Math.floor(lx);
			const br = bl + 1;
			const bt = tileMap.y + Math.floor(ly);
			const bb = bt + 1;

			const bx = ox > 0 ? bl : br;
			const by = oy > 0 ? bt : bb;

			const horiz = Geometry.lineIntersectsLine(
				qStartX + -dx, qStartY + -dy, qEndX, qEndY
				, bl, by, br, by
			);

			const vert = Geometry.lineIntersectsLine(
				qStartX + -dx, qStartY + -dy, qEndX, qEndY
				, bx, bt, bx, bb
			);

			if(horiz)
			{
				px = horiz[0];
				py = horiz[1];
			}
			else if(vert)
			{
				px = vert[0];
				py = vert[1];
			}

			/** @type Set<TerrainPoint> */
			const points = new Set([ [px, py, 0, layerId, tileMap] ]);

			if(window.smDebug)
			{
				console.log(points, {px, py, endX, endY});
				console.log('================================');
			}

			return points;
		}

		const bs = 32;

		const initMode = startTile === null ? 0 : 1;

		/** @type {number|boolean} */
		let modeX = initMode;

		/** @type {number|boolean} */
		let modeY = initMode;

		/** @type {number|boolean} */
		let oldModeX = false;

		/** @type {number|boolean} */
		let oldModeY = false;

		let bf = 1;

		const ax = xOff + (sx > 0 ? (bs - qStartX % bs) : ((qStartX % bs) + 1));
		const ay = yOff + (sy > 0 ? (bs - qStartY % bs) : ((qStartY % bs) + 1));

		let checkX = initMode ? 0 : ax;
		let checkY = initMode ? 0 : ay;

		let rayX = checkX * sx;
		let rayY = checkY * sy;

		/** @type {TerrainPoint|null} */
		let solidX = null;

		/** @type {TerrainPoint|null} */
		let solidY = null;

		if(window.smDebug) window.debugPoints = [];

		const allPoints = new Set;

		let iterations = 0;
		while( (ox && Math.abs(rayX) <= hypot) || (oy && Math.abs(rayY) <= hypot) )
		{
			if(sx && (!sy || Math.abs(rayX) < Math.abs(rayY)))
			{
				const mag = Math.abs(rayX);

				let pt = mag / hypot;
				let px = qStartX + checkX * ox;
				let py = qStartY + pt * dy;

				oldModeX = modeX;
				modeX = tileMap.getCollisionTile(px, py, layerId);
				bf = modeX ? 1 : bs;

				if(!modeX && oldModeX)
				{
					bf = sx < 0
						? mod(qStartX + -checkX + (1/256) + -xOff,  bs)
						: mod(bs - ((qStartX + checkX + -xOff)), bs)
				}

				if(window.smDebug) window.debugPoints.push([px, py, pt, layerId]);

				if(tileMap.getSolid(px, py, layerId))
				{
					const lx = px - tileMap.x;
					const ly = py - tileMap.y;

					const bl = tileMap.x + Math.floor(lx);
					const br = bl + 1;
					const bt = tileMap.y + Math.floor(ly);
					const bb = bt + 1;

					const bx = ox > 0 ? bl : br;
					const by = oy > 0 ? bt : bb;

					const horiz = Geometry.lineIntersectsLine(
						qStartX, qStartY, qEndX, qEndY
						, bl, by, br, by
					);

					const vert = Geometry.lineIntersectsLine(
						qStartX, qStartY, qEndX, qEndY
						, bx, bt, bx, bb
					);

					if(horiz)
					{
						px = horiz[0];
						py = horiz[1];
					}
					else if(vert)
					{
						px = vert[0];
						py = vert[1];
					}

					solidX = [px, py, pt, layerId, tileMap];

					allPoints.add([px, py, pt, layerId, tileMap, 3]);

					break;
				}
				else if(rayFlags & this.T_ALL_POINTS)
				{
					allPoints.add([px, py, pt, layerId, tileMap, 1]);
				}

				checkX += bf;
				rayX = checkX * sx;
			}
			else
			{
				const mag = Math.abs(rayY);

				let pt = mag / hypot;
				let py = qStartY + checkY * oy;
				let px = qStartX + pt * dx;

				oldModeY = modeY;
				modeY = tileMap.getCollisionTile(px, py, layerId);
				bf = modeY ? 1 : bs;

				if(!modeY && oldModeY)
				{
					bf = sy < 0
						? mod(qStartY + -checkY + (1/256) + -yOff, bs)
						: mod(bs - ((qStartY + checkY + -yOff)), bs);
				}

				if(window.smDebug) window.debugPoints.push([px, py, pt, layerId]);

				if(tileMap.getSolid(px, py, layerId))
				{
					const lx = px - tileMap.x;
					const ly = py - tileMap.y;

					const bl = tileMap.x + Math.floor(lx);
					const br = bl + 1;
					const bt = tileMap.y + Math.floor(ly);
					const bb = bt + 1;

					const bx = sx > 0 ? bl : br;
					const by = sy > 0 ? bt : bb;

					const horiz = Geometry.lineIntersectsLine(
						qStartX, qStartY, qEndX, qEndY
						, bl, by, br, by
					);

					const vert = Geometry.lineIntersectsLine(
						qStartX, qStartY, qEndX, qEndY
						, bx, bt, bx, bb
					);

					if(horiz)
					{
						px = horiz[0];
						py = horiz[1];
					}
					else if(vert)
					{
						px = vert[0];
						py = vert[1];
					}

					solidY = [px, py, pt, layerId, tileMap];

					allPoints.add([px, py, pt, layerId, tileMap, 4]);

					break;
				}
				else if(rayFlags & this.T_ALL_POINTS)
				{
					allPoints.add([px, py, pt, layerId, tileMap, 2]);
				}

				checkY += bf;
				rayY = checkY * sy;
			}

			iterations++;
		}

		if(rayFlags & this.T_ALL_POINTS)
		{
			return allPoints;
		}

		if(window.smDebug)
		{
			console.log(window.debugPoints);
			console.log('================================');
		}

		return new Set([... solidX ? [solidX] : [], ... solidY ? [solidY] : []]);
	}
}
