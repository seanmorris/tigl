import { Bindable } from 'curvature/base/Bindable';
import { Tileset } from '../sprite/Tileset';
import { TileMap } from './TileMap';
import { Rectangle } from '../math/Rectangle';
import { SMTree } from '../math/SMTree';

export class World
{
	constructor({src})
	{
		this[Bindable.Prevent] = true;
		this.ready = this.getReady(src);
		this.maps = [];
		this.mTree = new SMTree;
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

	getMapsForRect(x, y, w, h)
	{
		const rects = this.mTree.query(x + -w*0.5, y + -h*0.5, x + w*0.5, y + h*0.5);
		const maps = new Set;

		window.smProfiling && console.time('query mapTree');

		for(const rect of rects)
		{
			const map = this.rectMap.get(rect);
			maps.add(map);
		}

		window.smProfiling && console.timeEnd('query mapTree');

		return maps;
	}
}
