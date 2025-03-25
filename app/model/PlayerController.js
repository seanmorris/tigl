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

		this.xSpeed = 0;
		this.ySpeed = 0;

		this.grounded = true;
		this.grounded = 0;

		this.gravity = 0.5;

		this.lastMap = null;
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
			this.ySpeed = Math.min(8, this.ySpeed + gravity);
			this.grounded = false;
		}
		else if(this.ySpeed >= 0)
		{
			this.ySpeed = Math.min(0, this.ySpeed);
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

			if(this.ySpeed >= 0 && entity.y < otherTop + 16)
			{
				entity.y = otherTop;
				this.ySpeed = Math.min(0, this.ySpeed);
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
				this.xSpeed += xAxis * (this.grounded ? 0.2 : 0.3);
			}

			if(Math.abs(this.xSpeed) > 8)
			{
				this.xSpeed = 8 * Math.sign(this.xSpeed);
			}

			if(this.grounded && xAxis && Math.sign(xAxis) !== Math.sign(this.xSpeed))
			{
				this.xSpeed *= 0.75;
			}
		}
		else if(this.grounded)
		{
			this.xSpeed *= 0.9;
		}
		else
		{
			this.xSpeed *= 0.99;
		}

		if(world.getSolid(entity.x, entity.y) && !world.getSolid(entity.x, entity.y + -entity.height))
		{
			this.ySpeed = 0;
			entity.y--;
		}

		while(world.getSolid(entity.x, entity.y + -entity.height) && !world.getSolid(entity.x, entity.y))
		{
			this.ySpeed = 0;
			entity.y++;
		}

		while(world.getSolid(entity.x + -entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x + entity.width * 0.5, entity.y + -8))
		{
			this.xSpeed = 0;
			entity.x++;
		}

		while(world.getSolid(entity.x + entity.width * 0.5, entity.y + -8) && !world.getSolid(entity.x - entity.width * 0.5, entity.y + -8))
		{
			this.xSpeed = 0;
			entity.x--;
		}

		if(this.xSpeed || this.ySpeed)
		{
			const direction = Math.atan2(this.ySpeed, this.xSpeed);
			const distance = Math.hypot(this.ySpeed, this.xSpeed);

			regions.forEach(region => {
				this.xSpeed *= region.drag;
				if(this.ySpeed > 0)
				{
					this.ySpeed *= region.drag;
				}
			});

			const hit = Ray.cast(
				world
				, entity.x
				, entity.y + -entity.height * 0.5
				, 0
				, direction
				, distance
				, Ray.T_LAST_EMPTY
			);

			let xMove = this.xSpeed;
			let yMove = this.ySpeed;

			if(hit.terrain)
			{
				const actualDistance = Math.hypot(
					entity.x - hit.terrain[0]
					, entity.y - hit.terrain[1]
				);

				xMove = Math.cos(direction) * actualDistance;
				yMove = Math.sin(direction) * actualDistance;
			}

			if(hit.entities.size)
			{
				hit.entities.delete(entity);
				hit.entities.forEach((point, other) => {
					other.collide(entity, point);
					entity.collide(other, point);
				});
			}

			entity.x += xMove;
			entity.y += yMove;
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

		if(this.grounded && entity.inputManager && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === 1)
		{
			this.grounded = false;
			this.state = 'jumping';
			this.ySpeed = -10;
		}

		if(!this.grounded && entity.inputManager && entity.inputManager.buttons[0] && entity.inputManager.buttons[0].time === -1)
		{
			this.ySpeed = Math.max(-4, this.ySpeed);
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

			if(this.ySpeed > 0 && entity.y < otherTop + 16)
			{
				this.ySpeed = 0;
				this.grounded = true;
				this.y = otherTop;
			}
		}
	}
}
