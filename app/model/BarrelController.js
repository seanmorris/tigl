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
		this.shot = false;
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

		if(entity.xSpeed || entity.ySpeed)
		{
			const direction = Math.atan2(entity.ySpeed, entity.xSpeed);
			const distance = Math.hypot(entity.ySpeed, entity.xSpeed);
			const hit = world.castRay(
				entity.x
				, entity.y + -entity.height * 0.5
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

			if(!this.shot)
			{
				entity.xSpeed *= 0.9;
			}
		}
		else
		{
			entity.shot = false;
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
			this.stop(entity, entity.xSpeed);
			entity.xSpeed = 0;
			entity.x++;
		}

		while(world.getSolid(entity.x + entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x - entity.width * 0.5, entity.y + -8))
		{
			this.stop(entity, entity.xSpeed);
			entity.xSpeed = 0;
			entity.x--;
		}
	}

	stop(entity)
	{
		entity.xSpeed && console.log(entity.xSpeed);

		if(entity.xSpeed > 10)
		{
			entity.session.removeEntity(entity);
		}
	}

	collide(entity, other, point)
	{
		if(Math.sign(entity.x - other.x) === Math.sign(other.xSpeed))
		{
			entity.xSpeed = other.xSpeed;

			const min = 0.5 * (other.width + entity.width);

			if(Math.abs(other.x + other.xSpeed + -entity.x) < min)
			{
				entity.xSpeed += -Math.sign(other.x + other.xSpeed + -entity.x);
			}

			if(other.controller)
			{
				other.controller.pushing = entity;
			}
		}
	}

	destroy()
	{

	}
}
