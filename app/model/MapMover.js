import { roundedSquareWave } from "../math/roundSquareWave";

const SUBGRID_BITS = 8;
const SUBGRID_SIZE = 1 << SUBGRID_BITS;
const SUBGRID_INVR = 1 / SUBGRID_SIZE;

/**
 *
 */
export class MapMover
{
	/**
	 *
	 * @param map
	 */
	create(map)
	{
		this.xOriginal = map.x;
		this.yOriginal = map.y;
	}

	/**
	 *
	 * @param map
	 * @param delta
	 */
	simulate(map, delta)
	{
		if(map.props.get('yOscillate'))
		{
			// map.x = Math.round((this.xOriginal + 10) * SUBGRID_SIZE) * SUBGRID_INVR;
			// map.y = Math.round((this.yOriginal + 10) * SUBGRID_SIZE) * SUBGRID_INVR;
			// return;

			const range = map.props.get('yOscillate');
			const delay = map.props.get('delay');
			const age = map.session.world.age;
			const current = roundedSquareWave(age/delay, 0.6);

			map.y = Math.round((this.yOriginal + (current * range)) * SUBGRID_SIZE) * SUBGRID_INVR;
			// map.y = this.yOriginal + 0.25;
		}
	}
}
