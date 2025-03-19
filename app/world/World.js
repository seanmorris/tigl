import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';
import { TileMap } from './TileMap';
import { Rectangle } from '../math/Rectangle';
import { MTree } from '../math/MTree';

export class World
{
	constructor({src})
	{
		this[Bindable.Prevent] = true;
		this.ready = this.getReady(src);
		this.maps = [];
		this.mTree = new MTree;
		this.rectMap = new Map;
	}

	async getReady(src)
	{
		const worldData = await (await fetch(src)).json();
		return await Promise.all(worldData.maps.map((m, i) => {
			const map = new TileMap({src: m.fileName});

			map.xWorld = m.x;
			map.yWorld = m.y;
			this.maps[i] = map;

			const rect = new Rectangle(m.x, m.y, m.x + m.width, m.y + m.height);

			this.rectMap.set(rect, map);

			this.mTree.add(rect);

			return map.ready;
		}));
	}

	getMapsForPoint(x, y)
	{
		const rects = this.mTree.query(x, y, x, y);
		const maps = new Set;

		for(const rect of rects)
		{
			const map = this.rectMap.get(rect);
			maps.add(map);
		}

		return maps;
	}
}
