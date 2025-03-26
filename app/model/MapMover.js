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
			const current = Math.cos(Math.sin(age/delay)**5)**(16);

			map.y = this.yOriginal + current * range;

			// map.y = Math.round(map.y);
		}
	}
}