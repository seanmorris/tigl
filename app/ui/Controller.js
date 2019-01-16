import { View } from 'curvature/base/View';

export class Controller extends View
{
	constructor(args)
	{
		super(args);
		this.template  = require('./controller.tmp');
		this.dragStart = false;

		this.args.dragging  = false;
		this.args.x = 0;
		this.args.y = 0;

		window.addEventListener('mousemove', (event) => {
			this.moveStick(event);
		});

		window.addEventListener('mouseup', (event) => {
			this.dropStick(event);
		});
	}

	dragStick(event)
	{
		this.args.dragging = true;
		this.dragStart     = {
			x:   event.clientX
			, y: event.clientY
		};
	}

	moveStick(event)
	{
		if(this.args.dragging)
		{
			this.args.xx = event.clientX - this.dragStart.x;
			this.args.yy = event.clientY - this.dragStart.y;

			const limit = 50;

			if(this.args.xx < -limit)
			{
				this.args.x = -limit;
			}
			else if(this.args.xx > limit)
			{
				this.args.x = limit;
			}
			else
			{
				this.args.x = this.args.xx;
			}

			if(this.args.yy < -limit)
			{
				this.args.y = -limit;
			}
			else if(this.args.yy > limit)
			{
				this.args.y = limit;
			}
			else
			{
				this.args.y = this.args.yy;
			}
		}
	}

	dropStick(event)
	{
		this.args.dragging = false;
		this.args.x = 0;
		this.args.y = 0;
	}
}
