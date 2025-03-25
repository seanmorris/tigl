import { Ray } from "../math/Ray";

const fireRegion  = [1, 0, 0];
const waterRegion = [0, 1, 1];

export class PlayerController
{
	static spriteSheet = '/player.tsj';

	create(entity, entityData)
	{
		this.direction = 'south';
		this.state = 'standing';

		entity.xSpeed = 0;
		entity.ySpeed = 0;

		entity.height = 34;
		entity.width = 24;

		this.grounded = true;
		this.grounded = 0;

		this.gravity = 0.5;

		this.lastMap = null;
		this.pushing = null;
	}

	simulate(entity)
	{
		if(this.state === 'jumping')
		{
			entity.height = 24;
		}
		else
		{
			entity.height = 34;
		}

		const xAxis = entity.inputManager ? ( Math.min(1, Math.max(entity.inputManager.axes[0].magnitude || 0, -1)) || 0 ) : 0;
		const yAxis = entity.inputManager ? ( Math.min(1, Math.max(entity.inputManager.axes[1].magnitude || 0, -1)) || 0 ) : 0;

		const world = entity.session.world;

		const solidTerrain = world.getSolid(entity.x, entity.y + 1);
		const solidEntities = [...world.getEntitiesForPoint(entity.x, entity.y + 1)].filter(entity => entity.flags & 0x1);
		const regions = world.getRegionsForPoint(entity.x, entity.y);
		const maps = world.getMapsForPoint(entity.x, entity.y);
		const firstMap = [...maps][0];

		let gravity = this.gravity;

		regions.forEach(region => {
			gravity *= region.gravity ?? 1;
		})

		if(!solidTerrain)
		{
			entity.ySpeed = Math.min(8, entity.ySpeed + gravity);
			this.grounded = false;
		}
		else if(entity.ySpeed >= 0)
		{
			entity.ySpeed = Math.min(0, entity.ySpeed);
			this.grounded = true;
		}

		if(solidTerrain)
		{
			world.motionGraph.add(entity, firstMap);
			this.lastMap = firstMap;
		}
		else if(solidEntities.length)
		{
			const otherTop = solidEntities[0].y - solidEntities[0].height;

			if(entity.ySpeed >= 0 && entity.y < otherTop + 16)
			{
				entity.y = otherTop;
				entity.ySpeed = Math.min(0, entity.ySpeed);
				this.grounded = true;

				world.motionGraph.add(entity, solidEntities[0]);
			}
		}
		else if(maps.has(this.lastMap))
		{
			world.motionGraph.add(entity, this.lastMap);
		}
		else if(!maps.has(this.lastMap))
		{
			world.motionGraph.delete(entity);
		}

		if(xAxis)
		{
			this.xDirection = Math.sign(xAxis);

			if(!world.getSolid(entity.x + Math.sign(xAxis) * entity.width * 0.5 + Math.sign(xAxis), entity.y))
			{
				entity.xSpeed += xAxis * (this.grounded ? 0.2 : 0.3);
			}

			if(Math.abs(entity.xSpeed) > 8)
			{
				entity.xSpeed = 8 * Math.sign(entity.xSpeed);
			}

			if(this.grounded && xAxis && Math.sign(xAxis) !== Math.sign(entity.xSpeed))
			{
				entity.xSpeed *= 0.75;
			}
		}
		else if(this.grounded)
		{
			entity.xSpeed *= 0.9;
		}
		else
		{
			entity.xSpeed *= 0.99;
		}

		if(this.pushing)
		{
			if(entity.xSpeed && Math.sign(entity.xSpeed) !== Math.sign(this.pushing.x - entity.x))
			{
				this.pushing = null;
			}

			if(!this.grounded)
			{
				this.pushing = null;
			}

		}

		const direction = Math.atan2(entity.ySpeed, entity.xSpeed);
		const distance = Math.hypot(entity.ySpeed, entity.xSpeed);

		const entities = Ray.castEntity(
			world
			, entity.x
			, entity.y + -entity.height * 0.5
			, 0
			, this.xDirection < 0 ? Math.PI : 0
			, distance + entity.width * 0.5
			, Ray.T_LAST_EMPTY
		);

		if(entities)
		{
			entities.delete(entity);
			entities.forEach((point, other) => {
				other.collide(entity, point);
				entity.collide(other, point);
			});
		}

		if(entity.xSpeed || entity.ySpeed)
		{
			regions.forEach(region => {
				entity.xSpeed *= region.drag;
				if(entity.ySpeed > 0)
				{
					entity.ySpeed *= region.drag;
				}
			});

			const terrain = Ray.castTerrain(
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

			if(terrain)
			{
				const actualDistance = Math.hypot(
					entity.x - terrain[0]
					, entity.y - terrain[1]
				);

				xMove = Math.cos(direction) * actualDistance;
				yMove = Math.sin(direction) * actualDistance;
			}

			entity.x += xMove;
			entity.y += yMove;
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

		if(this.grounded)
		{
			this.state = xAxis ? 'walking' : 'standing';

			if(xAxis < 0)
			{
				this.direction = 'west';
			}
			else if(xAxis > 0)
			{
				this.direction = 'east';
			}
		}

		if(entity.inputManager)
		{
			if(this.grounded && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === 1)
			{
				this.grounded = false;
				this.state = 'jumping';
				entity.ySpeed = -10;
			}

			if(!this.grounded && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === -1)
			{
				entity.ySpeed = Math.max(-4, entity.ySpeed);
			}

			if(this.pushing && entity.inputManager.buttons[1] && entity.inputManager.buttons[1].time === 1)
			{
				this.pushing.controller.shot = true;
				this.pushing.xSpeed *= 4;
				this.pushing = null;
			}
		}

		if(entity.sprite)
		{
			if(this.state === 'jumping')
			{
				entity.sprite.scaleX = this.xDirection;
				entity.sprite.changeAnimation(`${this.state}`);
			}
			else
			{
				entity.sprite.scaleX = 1;
				entity.sprite.changeAnimation(`${this.state}-${this.direction}`);
			}
		}

		if(this.state === 'jumping' && this.direction === 'south')
		{
			this.xDirection = 1;
			this.direction = 'east';
		}
	}

	collide(entity, other, point)
	{
		if(other.flags & 0x1)
		{
			const otherTop = other.y - other.height;

			if(entity.ySpeed > 0 && entity.y < otherTop + 16)
			{
				entity.ySpeed = 0;
				this.grounded = true;
				this.y = otherTop;
			}
		}
	}
}
