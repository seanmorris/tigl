import { Geometry } from "./Geometry";

export class Ray
{
	static T_LAST_EMPTY  = 0b0000_0001;
	static T_ALL_POINTS  = 0b0000_0010;
	static T_SNAP_TO_INT = 0b0000_0100;
	static T_GET_LENGTH  = 0b0000_1000;

	static E_NO_MINK     = 0b0001_0000;

	// static E_ALL_ENTITIES = 0b0000_0001_0000_0000;

	static DEFAULT_FLAGS = 0b0000_0000;

	static cast(world, startX, startY, angle, length = 320, rayFlags = this.DEFAULT_FLAGS, layerId)
	{
		const terrain = this.castTerrain(world, startX, startY, angle, length, rayFlags, layerId);
		const entities = this.castEntity(world, startX, startY, angle, length, rayFlags);

		return {terrain, entities};
	}

	static castEntity(world, startX, startY, angle, length = 320, rayFlags = this.DEFAULT_FLAGS, castingEntity = null)
	{
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);

		const endX = startX + (Math.abs(cos) > Number.EPSILON ? cos : 0) * length;
		const endY = startY + (Math.abs(sin) > Number.EPSILON ? sin : 0) * length;

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

	static castTerrain(world, startX, startY, angle, length = 320, rayFlags = this.DEFAULT_FLAGS, layerId = 0)
	{
		length = Math.ceil(length);

		const cos = Math.cos(angle);
		const sin = Math.sin(angle);

		const endX = startX + (Math.abs(cos) > Number.EPSILON ? cos : 0) * length;
		const endY = startY + (Math.abs(sin) > Number.EPSILON ? sin : 0) * length;

		const bs = 32;

		const dx = endX - startX;
		const dy = endY - startY;

		const ox = Math.sign(dx);
		const oy = Math.sign(dy);

		const sx = dx ? Math.hypot(1, (dy / dx)) : 0;
		const sy = dy ? Math.hypot(1, (dx / dy)) : 0;

		let currentDistance = 0;

		if(world.getSolid(startX, startY, layerId))
		{
			if(rayFlags & this.T_GET_LENGTH)
			{
				return 0;
			}

			return [startX, startY];
		}

		const startTile = world.getCollisionTile(startX, startY, layerId);

		const initMode = startTile === null ? 0 : 1;

		let modeX = initMode;
		let modeY = initMode;

		let oldModeX = false;
		let oldModeY = false;

		let bf = initMode ? 1 : 1;

		const ax = ox > 0 ? (bs - startX % bs) : ((startX % bs) + 1);
		const ay = oy > 0 ? (bs - startY % bs) : ((startY % bs) + 1);

		let checkX = initMode ? 0 : ax;
		let checkY = initMode ? 0 : ay;

		let rayX = checkX * sx * ox;
		let rayY = checkY * sy * oy;

		const solidsX = new Set;
		const solidsY = new Set;

		let iterations = 0;
		while(Math.abs(currentDistance) < length && !solidsX.size && !solidsY.size)
		{
			if(ox && (!oy || Math.abs(rayX) < Math.abs(rayY)))
			{
				const mag = Math.abs(rayX);

				let px = (startX + mag * cos);
				let py = (startY + mag * sin);

				if(ox >= 0 && px % 1 > 0.99999) px = Math.round(px);
				if(oy >= 0 && py % 1 > 0.99999) py = Math.round(py);
				if(ox <= 0 && px % 1 < 0.00001) px = Math.round(px);
				if(oy <= 0 && py % 1 < 0.00001) py = Math.round(py);

				oldModeX = modeX;
				modeX = world.getCollisionTile(px, py, layerId);
				bf = modeX ? 1:bs;

				if(!modeX && oldModeX)
				{
					bf = ox < 0
						? ((startX + -checkX + 1) % bs)
						: (bs - ((startX + checkX) % bs));
				}

				if(world.getSolid(px, py, layerId))
				{
					solidsX.add([px, py]);
					break;
				}

				currentDistance = Math.abs(rayX);
				checkX += bf;
				rayX = checkX * sx * ox;
			}
			else
			{
				const mag = Math.abs(rayY);

				let px = (startX + mag * cos);
				let py = (startY + mag * sin);

				if(ox >= 0 && px % 1 > 0.99999) px = Math.round(px);
				if(oy >= 0 && py % 1 > 0.99999) py = Math.round(py);
				if(ox <= 0 && px % 1 < 0.00001) px = Math.round(px);
				if(oy <= 0 && py % 1 < 0.00001) py = Math.round(py);

				oldModeY = modeY;
				modeY = world.getCollisionTile(px, py, layerId)

				bf = modeY ? 1:bs;

				if(!modeY && oldModeY)
				{
					bf = oy < 0
						? ((startY + -checkY + 1) % bs)
						: (bs - ((startY + checkY) % bs));
				}

				if(world.getSolid(px, py, layerId))
				{
					solidsY.add([px, py]);
					break;
				}

				currentDistance = Math.abs(rayY);
				checkY += bf;
				rayY = checkY * sy * oy;
			}

			iterations++;
		}

		const points = [...solidsX, ...solidsY];

		if(rayFlags & this.T_ALL_POINTS)
		{
			return new solidsX.union(solidsY);
		}

		const distSquares = points.map(s => (s[0] - startX) ** 2 + (s[1] - startY) ** 2);
		const minDistSq   = Math.min(...distSquares);
		const nearest     = points[ distSquares.indexOf(minDistSq) ];

		if(nearest)
		{
			if(ox > 0 && nearest[0] % 1 > 0.99999) nearest[0] = Math.round(nearest[0]);
			if(ox < 0 && nearest[0] % 1 < 0.00001) nearest[0] = Math.round(nearest[0]);
			if(oy > 0 && nearest[1] % 1 > 0.99999) nearest[1] = Math.round(nearest[1]);
			if(oy < 0 && nearest[1] % 1 < 0.00001) nearest[1] = Math.round(nearest[1]);
		}

		if(Math.sqrt(minDistSq) > length)
		{
			return;
		}

		if(nearest)
		{
			if(rayFlags & this.T_LAST_EMPTY)
			{
				nearest[0] += -cos * Math.sign(rayX);
				nearest[1] += -sin * Math.sign(rayY);
			}

			if(rayFlags & this.T_SNAP_TO_INT)
			{
				if(ox > 0) nearest[0] = Math.floor(nearest[0]);
				if(ox < 0) nearest[0] = Math.ceil(nearest[0]);
				if(oy > 0) nearest[1] = Math.floor(nearest[1]);
				if(oy < 0) nearest[1] = Math.ceil(nearest[1]);
			}

			if(rayFlags & this.T_GET_LENGTH)
			{
				return Math.hypot(startX - nearest[0], startY - nearest[1]);
			}

			return nearest;
		}
	}
}
