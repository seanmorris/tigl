export class BarrelController
{
	static spriteImage = '/barrel.png';

	create(entity, entityData)
	{
		entity.xSpeed = 0;
		entity.ySpeed = 0;

		entity.height = 48;
		entity.width = 32;

		entity.ySpriteOffset = 6;

		this.grounded = true;

	}

	simulate(entity)
	{
		const world = entity.session.world;

		if(!world.getSolid(entity.x, entity.y + 1))
		{
			entity.ySpeed = Math.min(8, entity.ySpeed + 0.5);
			this.grounded = false;
		}
		else
		{
			entity.ySpeed = Math.min(0, entity.ySpeed);
			this.grounded = true;
		}

		if(world.getSolid(entity.x, entity.y) && !world.getSolid(entity.x, entity.y - 1))
		{
			entity.ySpeed = 0;
			entity.y--;
		}

		while(world.getSolid(entity.x, entity.y + -entity.height) && !world.getSolid(entity.x, entity.y))
		{
			entity.ySpeed = 0;
			entity.y++;
		}

		while(world.getSolid(entity.x + -entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x + entity.width * 0.5, entity.y + -8))
		{
			entity.xSpeed = 0;
			entity.x++;
		}

		while(world.getSolid(entity.x + entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x - entity.width * 0.5, entity.y + -8))
		{
			entity.xSpeed = 0;
			entity.x--;
		}

		if(entity.xSpeed || entity.ySpeed)
		{
			const direction = Math.atan2(entity.ySpeed, entity.xSpeed);
			const distance = Math.hypot(entity.ySpeed, entity.xSpeed);
			const hit = world.castRay(
				entity.x
				, entity.y
				, 0
				, direction
				, distance
				, 0x01
			);

			let xMove = entity.xSpeed;
			let yMove = entity.ySpeed;

			if(hit.terrain)
			{
				const actualDistance = Math.hypot(
					entity.x - hit.terrain[0]
					, entity.y - hit.terrain[1]
				);

				xMove = Math.cos(direction) * actualDistance;
				yMove = Math.sin(direction) * actualDistance;
			}

			entity.x += xMove;
			entity.y += yMove;

			entity.xSpeed *= 0.95;
			entity.ySpeed *= 0.95;
		}
	}

	collide(entity, other, point)
	{
		// entity.x = point[0] + 0.5 * entity.width;
		// entity.xSpeed = other.xSpeed;
	}
}
