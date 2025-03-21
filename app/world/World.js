import { Bindable } from 'curvature/base/Bindable';
import { Rectangle } from '../math/Rectangle';
import { TileMap } from './TileMap';
import { SMTree } from '../math/SMTree';

export class World
{
	constructor({src, session})
	{
		this[Bindable.Prevent] = true;
		this.ready = this.getReady(src);
		this.maps = [];
		this.mTree = new SMTree;
		this.rectMap = new Map;
		this.session = session;
	}

	async getReady(src)
	{
		const worldData = await (await fetch(src)).json();
		return await Promise.all(worldData.maps.map((m, i) => {
			const map = new TileMap({...m, session: this.session});

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

	getSolid(x, y, z)
	{
		const maps = this.getMapsForPoint(x, y);

		for(const map of maps)
		{
			const solid = map.getSolid(x, y, z);

			if(solid)
			{
				return solid;
			}
		}

		return null;
	}

	getCollisionTile(x, y, z)
	{
		const maps = this.getMapsForPoint(x, y);

		for(const map of maps)
		{
			const tile = map.getCollisionTile(x, y, z);

			if(tile > 0)
			{
				return tile;
			}
		}

		return null;
	}
}
