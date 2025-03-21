import { Bindable } from "curvature/base/Bindable";
import { Rectangle } from "../math/Rectangle";

export class Entity
{
	constructor({session, controller, sprite, x = 0, y = 0, width = 32, height = 32})
	{
		this[Bindable.Prevent] = true;

		this.controller = controller;
		this.sprite = sprite;
		this.session = session;

		this.x = x;
		this.y = y;

		this.xSpriteOffset = 0;
		this.ySpriteOffset = 0;

		this.width  = width;
		this.height = height;

		this.rect = new Rectangle(
			x - width * 0.5, y - height,
			x + width * 0.5, y
		);
	}

	create()
	{}

	simulate()
	{
		this.rect.x1 = this.x - this.width * 0.5;
		this.rect.x2 = this.x + this.width * 0.5;

		this.rect.y1 = this.y - this.height;
		this.rect.y2 = this.y;

		this.sprite.x = this.x + this.xSpriteOffset;
		this.sprite.y = this.y + this.ySpriteOffset;
	}

	destroy()
	{}
}
