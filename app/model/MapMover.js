import { roundedSquareWave } from "../math/roundSquareWave";

const SUBGRID_BITS = 8;
const SUBGRID_SIZE = 1 << SUBGRID_BITS;
const SUBGRID_INVR = 1 / SUBGRID_SIZE;

export class MapMover
{
	create(map)
	{
		this.yOriginal = map.y;

		console.log(this.yOriginal);
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

			map.y = Math.trunc((this.yOriginal + (current * range + 0.001)) * SUBGRID_SIZE) * SUBGRID_INVR;

			// map.y = this.yOriginal + Math.round(current * range);
			// map.y = this.yOriginal + current * range;
			// map.y = this.yOriginal + (142.66015625 - 128);
		}
	}
}
