import { Bindable } from "curvature/base/Bindable";
import { Rectangle } from "../math/Rectangle";
import { Sprite } from '../sprite/Sprite';
import { Properties } from "../world/Properties";

export class Entity
{
	static E_SOLID    = 0b0000_0001;
	static E_PLATFORM = 0b0001_0000;
	static E_STATIC   = 0b1000_0000;

	constructor(entityData)
	{
		this[Bindable.Prevent] = true;

		const {
			controller
			, session
			, inputManager
			, sprite
			, x = 0
			, y = 0
			, width = 32
			, height = 32
		} = entityData;

		this.controller = controller;
		this.id = entityData.id;

		this.xSpriteOffset = 0;
		this.ySpriteOffset = sprite ? 0 : 15;

		this.flags = 0b0000_0000;

		this.x = x;
		this.y = y;

		this.width  = width;
		this.height = height;

		this.sprite = sprite || new Sprite({
			session
			, src: '/thing.png'
			, width: 32
			, height: 32
		});

		this.inputManager = inputManager;
		this.session = session;
		this.props = new Properties(entityData.properties ?? [], this);
		this.entityData = entityData;

		this.rect = new Rectangle(
			x - width * 0.5, y - height,
			x + width * 0.5, y
		);

		this.xOrigin = x;
		this.yOrigin = x;

		this.sleeping = false;

		this.fresh = true;
		this.map = entityData.map;
		this.grounded = false;

		this.controller && this.controller.create(this, this.entityData);
	}

	simulate()
	{
		const startX = this.x;
		const startY = this.y;

		const world = this.session.world;

		const motionParent = world.motionGraph.getParent(this);
		const maps = world.getMapsForPoint(this.x, this.y);
		const firstMap = [...maps][0];

		if(!world.motionGraph.getParent(motionParent) && !maps.has(motionParent))
		{
			world.motionGraph.delete(this);
		}

		if(this.grounded && !world.motionGraph.getParent(this))
		{
			world.motionGraph.add(this, firstMap);
		}

		if(this.fresh)
		{
			this.fresh = false;
		}

		this.controller && this.controller.simulate(this);

		if(startX !== 0 || startY !== 0)
		{
			world.motionGraph.moveChildren(
				this
				, this.x - startX
				, this.y - startY
			);

			this.rect.x1 = this.x - this.width * 0.5;
			this.rect.x2 = this.x + this.width * 0.5;

			this.rect.y1 = this.y - this.height;
			this.rect.y2 = this.y;
		}

		if(this.sprite)
		{
			this.sprite.x = this.x + this.xSpriteOffset;
			this.sprite.y = this.y + this.ySpriteOffset;
		}

		this.fixFPE();
	}

	collide(other, point)
	{
		this.controller && this.controller.collide(this, other, point);
	}

	sleep()
	{
		if(!this.sleeping)
		{
			this.controller && this.controller.sleep(this);
			this.sleeping = true;
		}
	}

	wakeup()
	{
		if(this.sleeping)
		{
			this.controller && this.controller.wakeup(this);
			this.sleeping = false;
		}
	}

	destroy()
	{
		this.controller && this.controller.destroy(this);
	}

	fixFPE()
	{
		if(this.x % 1 > 0.99999) this.x = Math.round(this.x);
		if(this.y % 1 > 0.99999) this.y = Math.round(this.y);
		if(this.x % 1 < 0.00001) this.x = Math.round(this.x);
		if(this.y % 1 < 0.00001) this.y = Math.round(this.y);
	}
}
