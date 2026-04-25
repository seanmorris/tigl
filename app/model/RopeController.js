import { Ray } from "../math/Ray";

export class RopeController
{
	// static spriteImage = './rope.png';
	static spriteColor = [0, 255, 0, 128];

	create(entity, entityData)
	{
		this.width = 1;

		const world = entity.session.world;

		// window.smDebug = true;

		// console.log(Ray.castTerrain(
		// 	world, 64, 500, 1024, 500, 0
		// ));

		// console.log(Ray.castTerrain(
		// 	// world, 64, 466, 1024, 466, 0
		// 	// world, 990, 466, 0, 466, 0
		// 	world, 64, 466, 990, 466, 0
		// ));

		// window.smDebug = false;
	}

	destroy(entity){}

	simulate(entity)
	{
		const endpointId = entity.props.get('endpoint');
		const endpoint = entity.map.entityDefs[endpointId];

		const endX = endpoint.x;
		const endY = endpoint.y;

		const length = Math.hypot(entity.y - endY, entity.x - endX) + 1;
		const theta = Math.atan2(entity.y - endY, entity.x - endX) + -Math.PI * 0.5;

		entity.sprite.theta = theta;
		const scale = length / entity.sprite.height;

		entity.sprite.scaleY = scale;
		entity.sprite.repeatY = scale;
		entity.sprite.width = this.width;
		entity.sprite.tiled = true;
	}

	collide(entity, other, point){}
	sleep(entity){}
	wakeup(entity){}
}
