import { Bindable } from 'curvature/base/Bindable';
import { Rectangle } from '../math/Rectangle';
import { TileMap } from './TileMap';
import { SMTree } from '../math/SMTree';
import { Ray } from "../math/Ray";

export class World
{
	constructor({source, session})
	{
		this[Bindable.Prevent] = true;
		this.ready = this.getReady(source);
		this.maps = [];
		this.mTree = new SMTree;
		this.rectMap = new Map;
		this.session = session;
		this.source = source;
	}

	async getReady(src)
	{
		const worldData = await (await fetch(src)).json();
		return await Promise.all(worldData.maps.map((m, i) => {

			m.fileName = new URL(m.fileName, src).href;

			const map = new TileMap({...m, session: this.session});

			map.xWorld = m.x;
			map.yWorld = m.y;
			this.maps[i] = map;

			const rect = new Rectangle(m.x, m.y, m.x + m.width, m.y + m.height);

			this.rectMap.set(rect, map);
			this.mTree.add(rect);

			console.log(this);

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
		const result = new Set;
		const rects = this.mTree.query(x + -w*0.5, y + -h*0.5, x + w*0.5, y + h*0.5);

		window.smProfiling && console.time('query mapTree');

		for(const rect of rects)
		{
			result.add( this.rectMap.get(rect) );
		}

		window.smProfiling && console.timeEnd('query mapTree');

		return result;
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

	getEntitiesForRect(x, y, w, h)
	{
		const tilemaps = this.getMapsForRect(x, y, w, h);

		let result = new Set;
		window.smProfiling && console.time('query quadTree');
		for(const tilemap of tilemaps)
		{
			if(!tilemap.visible)
			{
				continue;
			}

			result = result.union(
				tilemap.quadTree.select(x + -w*0.5, y + -h*0.5, w, h)
			);
		}
		window.smProfiling && console.timeEnd('query quadTree');

		return result;
	}

	castRay(startX, startY, layerId, angle, maxDistance = 320, rayFlags = Ray.DEFAULT_FLAGS)
	{
		return Ray.cast(
			this
			, startX
			, startY
			, layerId
			, angle
			, maxDistance
			, rayFlags
		);
	}

	castTerrainRay(startX, startY, layerId, angle, maxDistance = 320, rayFlags = Ray.DEFAULT_FLAGS)
	{
		return Ray.castTerrain(
			this
			, startX
			, startY
			, layerId
			, angle
			, maxDistance
			, rayFlags
		);
	}

	castEntityRay(startX, startY, endX, endY, rayFlags = Ray.DEFAULT_FLAGS)
	{
		return Ray.castEntity(
			this
			, startX
			, startY
			, endX
			, endY
			, rayFlags
		);
	}
}
