import { Injectable } from '../inject/Injectable';
import { Sprite     } from '../sprite/Sprite';
import { Controller } from './Controller';
import { Camera     } from '../sprite/Camera';

export class Entity extends Injectable.inject({
	controller: Controller
	, sprite:   Sprite
	, Camera
}) {
	constructor()
	{
		super();
		this.direction = 'south';
		this.state     = 'standing';
	}

	create()
	{
	}

	draw()
	{
		this.sprite.draw();
	}

	simulate()
	{
		let speed = 8;

		if(this.controller.axis[0])
		{
			this.direction = 'west';

			if(this.controller.axis[0] > 0)
			{
				this.direction = 'east';
			}

			this.state = 'walking';
		}
		else if(this.controller.axis[1])
		{
			this.direction = 'north';

			if(this.controller.axis[1] > 0)
			{
				this.direction = 'south';
			}

			this.state = 'walking';
		}
		else
		{
			this.state = 'standing';
		}

		this.sprite.x += speed * (this.controller.axis[0] || 0);
		this.sprite.y += speed * (this.controller.axis[1] || 0);

		this.Camera.x = this.sprite.x;
		this.Camera.y = this.sprite.y;

		let frames = this.sprite[this.state][this.direction];

		this.sprite.setFrames(frames);
	}

	destroy()
	{
	}
}
