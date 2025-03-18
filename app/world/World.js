import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';
import { Map } from './Map';

export class World
{
	constructor({src})
	{
		this[Bindable.Prevent] = true;
		this.ready = this.getReady(src);
		this.maps = [];
	}

	async getReady(src)
	{
		const worldData = await (await fetch(src)).json();
		return await Promise.all(worldData.maps.map((m, i) => {
			const map = new Map({src: m.fileName});
			map.xWorld = m.x;
			map.yWorld = m.y;
			this.maps[i] = map;
			return map.ready;
		}));
	}
}
