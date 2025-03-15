const fireRegion = [1, 0, 0];
const waterRegion = [0, 1, 1];

export class Entity
{
	constructor({sprite, controller, x, y})
	{
		this.direction = 'south';
		this.state = 'standing';

		this.sprite = sprite;
		this.controller = controller;

		this.x = x;
		this.y = y;
	}

	create()
	{
	}

	simulate()
	{
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

		let speed = 4;

		let xAxis = this.controller.axis[0] || 0;
		let yAxis = this.controller.axis[1] || 0;

		for(let t in this.controller.triggers)
		{
			if(!this.controller.triggers[t])
			{
				continue;
			}

			this.sprite.spriteBoard.renderMode = t;

			console.log(t);
		}

		xAxis = Math.min(1, Math.max(xAxis, -1));
		yAxis = Math.min(1, Math.max(yAxis, -1));

		this.sprite.x += xAxis > 0
			? Math.ceil(speed * xAxis)
			: Math.floor(speed * xAxis);

		this.sprite.y += yAxis > 0
			? Math.ceil(speed * yAxis)
			: Math.floor(speed * yAxis);

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

		// if(!xAxis && !yAxis)
		// {
		// 	this.direction = 'south';
		// }

		let frames;

		if(frames = this.sprite[this.state][this.direction])
		{
			this.sprite.setFrames(frames);
		}
	}

	destroy()
	{
	}
}
