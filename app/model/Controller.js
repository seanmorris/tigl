import { Bindable   } from 'curvature/base/Bindable';
import { Injectable } from '../inject/Injectable';
import { Keyboard   } from 'curvature/input/Keyboard'

import { Controller as OnScreenJoyPad } from '../ui/Controller';

export class Controller extends Injectable.inject({
	Keyboard
	, OnScreenJoyPad

	, triggers: Bindable.makeBindable({})
	, axis:     Bindable.makeBindable({})
}) {
	constructor()
	{
		super();

		this.Keyboard.keys.bindTo((v,k,t,d)=>{
			if(v > 0)
			{
				this.keyPress(k,v,t[k]);
				return;
			}

			this.keyRelease(k,v,t[k]);
		});

		this.OnScreenJoyPad.args.bindTo('x', (v) => {
			this.axis[0] = v / 50;
		});

		this.OnScreenJoyPad.args.bindTo('y', (v) => {
			this.axis[1] = v / 50;
		});
	}

	keyPress(key, value, prev)
	{
		if(/^[0-9]$/.test(key))
		{
			this.triggers[key] = true;
			return;
		}

		switch(key)
		{
			case 'ArrowRight':
				this.axis[0] = 1;
				break;
			case 'ArrowDown':
				this.axis[1] = 1;
				break;
			case 'ArrowLeft':
				this.axis[0] = -1;
				break;
			case 'ArrowUp':
				this.axis[1] = -1;
				break;
		}
	}

	keyRelease(key, value, prev)
	{
		if(/^[0-9]$/.test(key))
		{
			this.triggers[key] = false;
			return;
		}

		switch(key)
		{
			case 'ArrowRight':
			case 'ArrowLeft':
				this.axis[0] = 0;
				break;
			case 'ArrowDown':
			case 'ArrowUp':
				this.axis[1] = 0;
				break;
		}
	}
}
