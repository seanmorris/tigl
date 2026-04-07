export class RopeController
{
	// static spriteImage = './rope.png';
	static spriteColor = [0, 255, 0, 128];

	create(entity, entityData)
	{
		this.width = 1;
		window.e = entity;

		const world = entity.session.world;

		// console.time('QL');
		// for(let i = 0; i < 20_000; ++i)
		// {
		// 	world.mapTree.queryLine(0, i / 1000, 1024, 1000 - (i / 1000));
		// }
		// console.timeEnd('QL');
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

		// entity.sprite.theta = theta;
		entity.sprite.theta = theta + performance.now() / 5_000;

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
