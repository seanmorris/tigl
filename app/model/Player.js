import { Entity } from "./Entity";

const fireRegion  = [1, 0, 0];
const waterRegion = [0, 1, 1];

export class Player extends Entity
{
	constructor(entityData)
	{
		super(entityData);

		this.direction = 'south';
		this.state = 'standing';
	}

	simulate()
	{
		const speed = 4;

		const xAxis = Math.min(1, Math.max(this.controller.axis[0] || 0, -1)) || 0;
		const yAxis = Math.min(1, Math.max(this.controller.axis[1] || 0, -1)) || 0;

		this.x += Math.abs(xAxis) * Math.sign(xAxis) * speed;
		this.y += Math.abs(yAxis) * Math.sign(yAxis) * speed;

		let horizontal = false;

		if(Math.abs(xAxis) > Math.abs(yAxis))
		{
			horizontal = true;
		}

		if(horizontal)
		{
			this.direction = 'west';

			if(xAxis > 0)
			{
				this.direction = 'east';
			}

			this.state = 'walking';

		}
		else if(yAxis)
		{
			this.direction = 'north';

			if(yAxis > 0)
			{
				this.direction = 'south';
			}

			this.state = 'walking';
		}
		else
		{
			this.state = 'standing';
		}

		this.sprite.changeAnimation(`${this.state}-${this.direction}`);

		if(Math.trunc(performance.now() / 1000) % 15 === 0)
		{
			this.sprite.region = null;
		}

		if(Math.trunc(performance.now() / 1000) % 15 === 5)
		{
			this.sprite.region = waterRegion;
		}

		if(Math.trunc(performance.now() / 1000) % 15 === 10)
		{
			this.sprite.region = fireRegion;
		}

		for(let t in this.controller.triggers)
		{
			if(!this.controller.triggers[t])
			{
				continue;
			}

			this.sprite.spriteBoard.renderMode = t;

			if(t === '9')
			{
				const maps = this.sprite.spriteBoard.world.getMapsForPoint(
					this.sprite.x, this.sprite.y,
				);

				maps.forEach(m => console.log(m.src));
			}
		}

		super.simulate();
	}
}
