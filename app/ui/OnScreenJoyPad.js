import { View } from 'curvature/base/View';

import template from './onScreenJoyPad.tmp.html';
console.log(template);
/**
 * @class OnScreenJoyPad
 * Represents an on-screen jopypad
 */
export class OnScreenJoyPad extends View
{
	/**
	 * Construct an OnScreenJoyPad object
	 * @param {object} [args] - Default args
	 */
	constructor(args = undefined)
	{
		super(args);

		this.template  = template;

		/** @type {{x: number, y: number}|false} */
		this.dragStart = false;

		/**
		 * @type {{dragging: boolean, x: number, y: number, xx: number, yy: number}}
		 */
		this.args;

		this.args.dragging  = false;
		this.args.x = 0;
		this.args.y = 0;

		/** @type {{[key: number]: number}} */
		this.buttons = [];

		/** @type {number} */
		this.limit;

		window.addEventListener('mousemove', (event) => {
			this.moveStick(event);
		});

		window.addEventListener('mouseup', (event) => {
			this.dropStick(event);
		});

		window.addEventListener('touchmove', (event) => {
			this.moveStick(event);
		});

		window.addEventListener('touchend', (event) => {
			this.dropStick(event);
		});

		this.draggingTouches = new Set;
	}

	/**
	 * Start dragging the analog stick
	 * @param {MouseEvent|TouchEvent} event - The event being handled
	 */
	dragStick(event)
	{
		event.preventDefault();

		if(event instanceof TouchEvent)
		{
			const touches = new Set(event.changedTouches);
			touches.forEach(touch => this.draggingTouches.add(touch.identifier));
			const touch = event.touches[0];
			this.dragStart = {
				x:   touch.clientX
				, y: touch.clientY
			};
		}
		else
		{
			this.dragStart = {
				x: event.clientX
				, y: event.clientY
			};
		}

		this.args.dragging = true;
	}

	/**
	 * Move the analog stick
	 * @param {MouseEvent|TouchEvent} event - The event being handled
	 */
	moveStick(event)
	{
		if(this.args.dragging && this.dragStart)
		{
			/** @type {Event|Touch} */
			let pos = event;

			if(event instanceof TouchEvent)
			{
				const touch = event.touches[0];
				this.args.xx = touch.clientX - this.dragStart.x;
				this.args.yy = touch.clientY - this.dragStart.y;
			}
			else
			{
				this.args.xx = event.clientX - this.dragStart.x;
				this.args.yy = event.clientY - this.dragStart.y;
			}

			this.limit = this.tags.joystick.offsetWidth * 0.5;

			if(this.args.xx < -this.limit)
			{
				this.args.x = -this.limit;
			}
			else if(this.args.xx > this.limit)
			{
				this.args.x = this.limit;
			}
			else
			{
				this.args.x = this.args.xx;
			}

			if(this.args.yy < -this.limit)
			{
				this.args.y = -this.limit;
			}
			else if(this.args.yy > this.limit)
			{
				this.args.y = this.limit;
			}
			else
			{
				this.args.y = this.args.yy;
			}
		}
	}

	/**
	 * Stop dragging the analog stick
	 * @param {MouseEvent|TouchEvent} event - The event being handled
	 */
	dropStick(event)
	{
		console.log(event);

		this.args.dragging = false;
		this.args.x = this.args.xx = 0;
		this.args.y = this.args.yy = 0;

		if(event instanceof TouchEvent)
		{
			let found = false;
			for(const touch of event.changedTouches)
			{
				if(this.draggingTouches.has(touch.identifier))
				{
					found = true;
					break;
				}
			}

			if(!found)
			{
				return;
			}
		}
	}

	/**
	 * Stop pushing a button
	 * @param {Event} event - The event being handled
	 * @param {number} button - The id of the button to release
	 */
	releaseButton(event, button)
	{
		this.buttons[button] = -1;
	}

	/**
	 * Start pushing a button
	 * @param {Event} event - The event being handled
	 * @param {number} button - The id of the button to press
	 */
	pressButton(event, button)
	{
		this.buttons[button] = this.buttons[button] || 0;
		this.buttons[button]++;

	}

	/**
	 * Supress the context menu
	 * @param {Event} event - The event being handled
	 */
	contextmenu(event)
	{
		console.log(event);
		event.preventDefault();
	}
}
