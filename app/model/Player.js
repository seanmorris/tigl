import { Entity } from "./Entity";

const fireRegion = [1, 0, 0];
const waterRegion = [0, 1, 1];

export class Player extends Entity
{
	simulate()
	{
		super.simulate();

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
	}
}
