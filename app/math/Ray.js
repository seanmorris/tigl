export class Ray
{
	static LAST_EMPTY = 0b0000_0000_0000_0001;

	static cast(world, startX, startY, layerId, angle, maxDistance = 320, rayFlags = 0x0)
	{
		maxDistance = Math.ceil(maxDistance);

		const cos = Math.cos(angle);
		const sin = Math.sin(angle);

		const endX = startX + (Math.abs(cos) > Number.EPSILON ? cos : 0) * maxDistance;
		const endY = startY + (Math.abs(sin) > Number.EPSILON ? sin : 0) * maxDistance;

		const bs = 32;

		const dx = endX - startX;
		const dy = endY - startY;

		const ox = Math.sign(dx);
		const oy = Math.sign(dy);

		const sx = dx ? Math.hypot(1, (dy / dx)) : 0;
		const sy = dy ? Math.hypot(1, (dx / dy)) : 0;

		let currentDistance = 0;

		// if(world.getSolid(startX, startY, layerId))
		// {
		// 	return [startX, startY];
		// }

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

		const magX = Math.abs(rayX);
		const magY = Math.abs(rayY);

		const pa = new Set;
		const pb = new Set;

		const solidsX = new Set;
		const solidsY = new Set;

		window.logPoints && console.time('rayCast');

		let iterations = 0;
		while(Math.abs(currentDistance) < maxDistance && !solidsX.size && !solidsY.size)
		{
			if(ox && (!oy || Math.abs(rayX) < Math.abs(rayY)))
			{
				const mag = Math.abs(rayX);

				let px = (startX + mag * Math.cos(angle));
				let py = (startY + mag * Math.sin(angle));

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

				let px = (startX + mag * Math.cos(angle));
				let py = (startY + mag * Math.sin(angle));

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

		if(Math.sqrt(minDistSq) > maxDistance)
		{
			return;
		}

		if(rayFlags & this.LAST_EMPTY)
		{
			return [
				nearest[0] + -Math.cos(angle) * Math.sign(rayX)
				, nearest[1] + -Math.sin(angle) * Math.sign(rayY)
			]
		}

		return nearest;
	}
}
