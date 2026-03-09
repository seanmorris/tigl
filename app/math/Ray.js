import { Entity } from "../model/Entity";
import { Geometry } from "./Geometry";

const SUBGRID_BITS = 8;
const SUBGRID_SIZE = 1 << SUBGRID_BITS;
const SUBGRID_INVR = 1 / SUBGRID_SIZE;
const MAX_GRID_IDX = 2 ** (Math.log2( 1 + Number.MAX_SAFE_INTEGER ) - SUBGRID_BITS);

const mod = (subj, pred) => ((subj % pred) + pred) + pred;

export class Ray
{
	static T_LAST_EMPTY  = 0b0000_0001;
	static T_ALL_POINTS  = 0b0000_0010;
	static T_SNAP_TO_INT = 0b0000_0100;
	static T_GET_LENGTH  = 0b0000_1000;

	static E_NO_MINK     = 0b0001_0000;
	static E_SOLID       = 0b0010_0000;

	// static E_ALL_ENTITIES = 0b0000_0001_0000_0000;

	static DEFAULT_FLAGS = 0b0000_0000;

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
		let nearest = terrain;
		let minDist = Infinity;
		if(rayFlags & this.T_ALL_POINTS)
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
		else if(rayFlags & this.T_GET_LENGTH)
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

		if(nearest)
		{
			return {terrain, entities, x: nearest[0], y: nearest[1], hit, t: nearest[2], d: minDist, layerId: nearest[3], ...nearest};
		}

		return {terrain, entities, hit, d: Number.isFinite(minDist) ? minDist : hypot};

	}

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

				const intersection = Geometry.lineIntersectsLine(x1, y1, x2, y2, startX, startY, endX, endY);

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

	static castTerrain(world, startX, startY, endX, endY, rayFlags = this.DEFAULT_FLAGS, layerId = 0)
	{
		if(-MAX_GRID_IDX > startX || startX >= MAX_GRID_IDX ) throw new Error(`startX must be within [${-MAX_GRID_IDX}, ${MAX_GRID_IDX})`);
		if(-MAX_GRID_IDX > startY || startY >= MAX_GRID_IDX ) throw new Error(`startY must be within [${-MAX_GRID_IDX}, ${MAX_GRID_IDX})`);
		if(-MAX_GRID_IDX > endX || endX >= MAX_GRID_IDX ) throw new Error(`endX must be within [${-MAX_GRID_IDX}, ${MAX_GRID_IDX})`);
		if(-MAX_GRID_IDX > endY || endY >= MAX_GRID_IDX ) throw new Error(`endY must be within [${-MAX_GRID_IDX}, ${MAX_GRID_IDX})`);

		const qStartX = Math.trunc(startX * SUBGRID_SIZE) * SUBGRID_INVR;
		const qStartY = Math.trunc(startY * SUBGRID_SIZE) * SUBGRID_INVR;

		const qEndX = Math.trunc(endX * SUBGRID_SIZE) * SUBGRID_INVR;
		const qEndY = Math.trunc(endY * SUBGRID_SIZE) * SUBGRID_INVR;

		const startTile = world.getCollisionTile(qStartX, qStartY, layerId);

		const dx = qEndX - qStartX;
		const dy = qEndY - qStartY;

		const hypot = Math.hypot(dy, dx);

		if(hypot === 0 || startTile && world.getSolidTerrain(qStartX, qStartY, layerId))
		{
			if(rayFlags & this.T_GET_LENGTH)
			{
				return 0;
			}

			return [qStartX, qStartY];
		}

		const cos = dx / hypot;
		const sin = dy / hypot;

		const bs = 32;

		const sx = dx ? hypot / dx : 0;
		const sy = dy ? hypot / dy : 0;

		const initMode = startTile === null ? 0 : 1;

		let modeX = initMode;
		let modeY = initMode;

		let oldModeX = false;
		let oldModeY = false;

		let bf = 1;

		const ax = sx > 0 ? (bs - qStartX % bs) : ((qStartX % bs) + 1);
		const ay = sy > 0 ? (bs - qStartY % bs) : ((qStartY % bs) + 1);

		let checkX = initMode ? 0 : ax;
		let checkY = initMode ? 0 : ay;

		let rayX = checkX * sx;
		let rayY = checkY * sy;

		let solidX = null;
		let solidY = null;

		const ox = Math.sign(dx);
		const oy = Math.sign(dy);

		let iterations = 0;
		while( (ox && Math.abs(rayX) < hypot) || (oy && Math.abs(rayY) < hypot) )
		{
			if(sx && (!sy || Math.abs(rayX) < Math.abs(rayY)))
			{
				const mag = Math.abs(rayX);

				let pt = mag / hypot;
				let px = qStartX + checkX * ox;
				let py = qStartY + pt * dy;

				oldModeX = modeX;
				modeX = world.getCollisionTile(px, py, layerId);
				bf = modeX ? 1 : bs;

				if(!modeX && oldModeX)
				{
					bf = sx < 0
						? mod((qStartX + -checkX + 1), bs)
						: mod((qStartX + checkX), bs);
				}

				if(world.getSolidTerrain(px, py, layerId))
				{
					solidX = [px, py, pt, layerId];
					break;
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
				modeY = world.getCollisionTile(px, py, layerId)
				bf = modeY ? 1 : bs;

				if(!modeY && oldModeY)
				{
					bf = sy < 0
						? mod((qStartY + -checkY + 1), bs)
						: mod((qStartY + checkY), bs);
				}

				if(world.getSolidTerrain(px, py, layerId))
				{
					solidY = [px, py, pt, layerId];
					break;
				}

				checkY += bf;
				rayY = checkY * sy;
			}

			iterations++;
		}

		const points = [... solidX ? [solidX] : [], ... solidY ? [solidY] : []];

		if(rayFlags & this.T_ALL_POINTS)
		{
			return new Set(points);
		}

		const distSquares = new Array(points.length);

		for(const p in points)
		{
			distSquares[p] = (points[p][0] - qStartX) ** 2 + (points[p][1] - qStartY) **2
		}

		const minDistSq   = Math.min(...distSquares);
		const nearest     = points[ distSquares.indexOf(minDistSq) ];

		if(Math.sqrt(minDistSq) > hypot)
		{
			return;
		}

		if(nearest)
		{
			if(rayFlags & this.T_LAST_EMPTY)
			{
				nearest[0] += -cos;
				nearest[1] += -sin;

				if(rayFlags & this.T_SNAP_TO_INT)
				{
					nearest[0] = Math.floor(nearest[0]);
					nearest[1] = Math.floor(nearest[1]);
				}
			}
			else if(rayFlags & this.T_SNAP_TO_INT)
			{
				if(sx > 0) nearest[0] = Math.round(nearest[0]);
				if(sx < 0) nearest[0] = Math.round(nearest[0]);
				if(sy > 0) nearest[1] = Math.round(nearest[1]);
				if(sy < 0) nearest[1] = Math.round(nearest[1]);
			}

			if(rayFlags & this.T_GET_LENGTH)
			{
				return Math.hypot(qStartX - nearest[0], qStartY - nearest[1]);
			}

			return nearest;
		}

		return null;
	}
}
