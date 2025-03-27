export class BarrelController
{
	static spriteImage = '/barrel.png';

	create(entity, entityData)
	{
		entity.xSpeed = 0;
		entity.ySpeed = 0;

		entity.height = 32;
		entity.width = 26;

		entity.ySpriteOffset = 6;

		entity.grounded = true;
		this.shot = false;
	}

	destroy(entity)
	{
	}

	simulate(entity)
	{
		const world = entity.session.world;

		if(!world.getSolid(entity.x, entity.y + 1))
		{
			entity.ySpeed = Math.min(8, entity.ySpeed + 0.5);
			entity.grounded = false;
		}
		else
		{
			entity.ySpeed = Math.min(0, entity.ySpeed);
			entity.grounded = true;
		}

		if(entity.xSpeed || entity.ySpeed)
		{
			const direction = Math.atan2(entity.ySpeed, entity.xSpeed);
			const distance = Math.hypot(entity.ySpeed, entity.xSpeed);
			const hit = world.castRay(
				entity.x
				, entity.y + -4
				, direction
				, distance
				, 0x01
			);

			let xMove = entity.xSpeed;
			let yMove = entity.ySpeed;

			if(hit.terrain)
			{
				xMove = hit.terrain[0] - entity.x;
				yMove = hit.terrain[1] - entity.y;
			}

			entity.x += xMove;
			entity.y += yMove;

			if(!this.shot)
			{
				entity.xSpeed *= 0.9125;
			}
		}
		else
		{
			entity.shot = false;
		}

		if(world.getSolid(entity.x, entity.y) && !world.getSolid(entity.x, entity.y + -entity.height))
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
			this.stop(entity, entity.xSpeed);
			entity.xSpeed = 0;
			entity.x++;
		}

		while(world.getSolid(entity.x + entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x + -entity.width * 0.5, entity.y + -8))
		{
			this.stop(entity, entity.xSpeed);
			entity.xSpeed = 0;
			entity.x--;
		}
	}

	collide(entity, other, point)
	{
		if(Math.abs(Math.sign(entity.x - other.x) - Math.sign(other.xSpeed)) < 2)
		{
			const dist = Math.abs(other.x + -entity.x);
			const min  = 0.5 * (other.width + entity.width) + Math.abs(other.xSpeed);
			const side = Math.sign(entity.x - other.x);

			entity.xSpeed = other.xSpeed;

			if(dist < min)
			{
				entity.xSpeed += (min - dist) * side;
			}

			other.controller.pushing = entity;

			// const maps = entity.session.world.getMapsForPoint(entity.x, entity.y);
			// maps.forEach(map => map.moveEntity(entity));
			// console.log(maps);
		}
	}

	sleep(entity)
	{
	}

	wakeup(entity)
	{
	}

	stop(entity)
	{
		if(entity.xSpeed > 10)
		{
			// entity.session.removeEntity(entity);
		}

		this.shot = false;
	}
}
