import { Bindable } from "curvature/base/Bindable";
import { Rectangle } from "../math/Rectangle";
import { Sprite } from '../sprite/Sprite';

export class Entity
{
	constructor(entityData)
	{
		const {controller, session, inputManager, sprite, x = 0, y = 0, width = 32, height = 32} = entityData;

		this[Bindable.Prevent] = true;

		this.controller = controller;

		this.sprite = sprite || new Sprite({
			session
			, src: '/thing.png'
			, width: 32
			, height: 32
		});

		this.inputManager = inputManager;
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

		controller && controller.onCreate(this, entityData);
	}

	simulate()
	{
		this.controller && this.controller.simulate(this);

		this.rect.x1 = this.x - this.width * 0.5;
		this.rect.x2 = this.x + this.width * 0.5;

		this.rect.y1 = this.y - this.height;
		this.rect.y2 = this.y;

		this.sprite.x = this.x + this.xSpriteOffset;
		this.sprite.y = this.y + this.ySpriteOffset;

		this.fixFPE();
	}

	destroy()
	{
		this.controller && controller.destroy(this);
	}

	fixFPE()
	{
		if(this.x % 1 > 0.99999) this.x = Math.round(this.x);
		if(this.y % 1 > 0.99999) this.y = Math.round(this.y);
		if(this.x % 1 < 0.00001) this.x = Math.round(this.x);
		if(this.y % 1 < 0.00001) this.y = Math.round(this.y);
	}
}
