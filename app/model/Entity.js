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

		this.sprite.spriteBoard.renderMode = 0;
	}

	create()
	{
	}

	simulate()
	{
		let speed = 4;

		const xAxis = Math.min(1, Math.max(this.controller.axis[0] || 0, -1)) || 0;
		const yAxis = Math.min(1, Math.max(this.controller.axis[1] || 0, -1)) || 0;

		this.sprite.x += Math.abs(xAxis) * Math.sign(xAxis) * speed;
		this.sprite.y += Math.abs(yAxis) * Math.sign(yAxis) * speed;

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
	}

	destroy()
	{
	}
}
