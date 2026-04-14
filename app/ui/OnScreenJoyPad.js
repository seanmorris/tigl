import { View } from 'curvature/base/View';

/**
 * @class OnScreenJoyPad
 * Represents an on-screen jopypad
 * @augments View
 */
export class OnScreenJoyPad extends View
{
	/**
	 * Construct an OnScreenJoyPad object
	 * @param {object} args - Default args
	 */
	constructor(args)
	{
		super(args);
		this.template  = require('./onScreenJoyPad.tmp');
		this.dragStart = false;

		this.args.dragging  = false;
		this.args.x = 0;
		this.args.y = 0;

		this.buttons = [];

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
	 * @param {Event} event - The event being handled
	 */
	dragStick(event)
	{
		if(event.changedTouches)
		{
			const touches = new Set(event.changedTouches);
			touches.forEach(touch => this.draggingTouches.add(touch.identifier));
		}

		let pos = event;

		event.preventDefault();

		if(event.touches && event.touches[0])
		{
			pos = event.touches[0];
		}

		this.args.dragging = true;
		this.dragStart     = {
			x:   pos.clientX
			, y: pos.clientY
		};
	}

	/**
	 * Move the analog stick
	 * @param {Event} event - The event being handled
	 */
	moveStick(event)
	{
		if(this.args.dragging)
		{
			let pos = event;

			if(event.touches && event.touches[0])
			{
				pos = event.touches[0];
			}

			this.args.xx = pos.clientX - this.dragStart.x;
			this.args.yy = pos.clientY - this.dragStart.y;

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
	 * @param {Event} event - The event being handled
	 */
	dropStick(event)
	{
		if(event.changedTouches)
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

		this.args.dragging = false;
		this.args.x = 0;
		this.args.y = 0;
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
