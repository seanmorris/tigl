import { Injectable } from '../inject/Injectable';
import { Sprite     } from '../sprite/Sprite';
import { Controller } from './Controller';
import { Camera     } from '../sprite/Camera';

export class Entity extends Injectable.inject({sprite: Sprite, Controller, Camera})
{
	constructor()
	{
		super();
		this.direction = 'south';
		this.state     = 'standing';
	}

	create()
	{
	}

	simulate()
	{
		let speed = 4;

		let xAxis = this.Controller.axis[0] || 0;
		let yAxis = this.Controller.axis[1] || 0;

		for(let t in this.Controller.triggers)
		{
			if(!this.Controller.triggers[t])
			{
				continue;
			}

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

		this.Camera.x = this.sprite.x;
		this.Camera.y = this.sprite.y;

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
