import { Ray } from "../math/Ray";

const fireRegion  = [1, 0, 0];
const waterRegion = [0, 1, 1];

export class PlayerController
{
	static spriteSheet = '/player.tsj';

	onCreate(entity, entityData)
	{
		entity.direction = 'south';
		entity.state = 'standing';

		entity.xSpeed = 0;
		entity.ySpeed = 0;

		entity.grounded = true;

		entity.xDirection = 0;

		entity.ySpriteOffset = 1;
	}

	simulate(entity)
	{
		if(entity.state === 'jumping')
		{
			entity.height = 24;
		}
		else
		{
			entity.height = 48;
		}

		const speed = 4;

		const xAxis = entity.inputManager ? ( Math.min(1, Math.max(entity.inputManager.axes[0].magnitude || 0, -1)) || 0 ) : 0;
		const yAxis = entity.inputManager ? ( Math.min(1, Math.max(entity.inputManager.axes[1].magnitude || 0, -1)) || 0 ) : 0;

		const world = entity.session.world;

		if(!world.getSolid(entity.x, entity.y + 1))
		{
			entity.ySpeed = Math.min(8, entity.ySpeed + 0.5);
			entity.grounded = false;
		}
		else if(entity.ySpeed >= 0)
		{
			entity.ySpeed = Math.min(0, entity.ySpeed);
			entity.grounded = true;
		}

		if(xAxis)
		{
			entity.xDirection = Math.sign(xAxis);

			if(!world.getSolid(entity.x + Math.sign(xAxis) * entity.width * 0.5 + Math.sign(xAxis), entity.y))
			{
				entity.xSpeed += xAxis * (entity.grounded ? 0.2 : 0.4);
			}

			if(Math.abs(entity.xSpeed) > 8)
			{
				entity.xSpeed = 8 * Math.sign(entity.xSpeed);
			}

			if(entity.grounded && xAxis && Math.sign(xAxis) !== Math.sign(entity.xSpeed))
			{
				entity.xSpeed *= 0.75;
			}
		}
		else if(entity.grounded)
		{
			entity.xSpeed *= 0.9;
		}
		else
		{
			entity.xSpeed *= 0.99;
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

			const hit = Ray.cast(
				world
				, entity.x
				, entity.y
				, 0
				, direction
				, distance
				, Ray.T_LAST_EMPTY
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
		}

		if(entity.grounded)
		{
			entity.state = xAxis ? 'walking' : 'standing';

			if(xAxis < 0)
			{
				entity.direction = 'west';
			}
			else if(xAxis > 0)
			{
				entity.direction = 'east';
			}
		}

		if(entity.grounded && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === 1)
		{
			entity.grounded = false;
			entity.state = 'jumping';
			entity.ySpeed = -10;
		}

		entity.sprite.changeAnimation(`${entity.state}-${entity.direction}`);

		// if(Math.trunc(performance.now() / 1000) % 15 === 0)
		// {
		// 	entity.sprite.region = null;
		// }

		// if(Math.trunc(performance.now() / 1000) % 15 === 5)
		// {
		// 	entity.sprite.region = waterRegion;
		// }

		// if(Math.trunc(performance.now() / 1000) % 15 === 10)
		// {
		// 	entity.sprite.region = fireRegion;
		// }

		// if(entity.state === 'jumping' && entity.direction === 'south')
		// {
		// 	entity.direction = 'east';
		// }
	}
}
