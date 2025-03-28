import { roundedSquareWave } from "../math/roundSquareWave";

export class MapMover
{
	create(map)
	{
		this.yOriginal = map.y;
	}

	simulate(map, delta)
	{
		// return;
		if(map.props.get('yOscillate'))
		{
			const range = map.props.get('yOscillate');
			const delay = map.props.get('delay');
			const age = map.session.world.age;
			const current = roundedSquareWave(age/delay, 0.6);

			map.y = this.yOriginal + current * range;
		}
	}
}