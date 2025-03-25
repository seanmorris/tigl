import { Bindable } from 'curvature/base/Bindable';
import { MotionGraph } from '../math/MotionGraph';
import { TileMap } from './TileMap';
import { SMTree } from '../math/SMTree';
import { Ray } from "../math/Ray";

const cache = new Map;

export class World
{
	constructor({src, session})
	{
		this[Bindable.Prevent] = true;
		this.src = new URL(src, location);
		this.ready = this.getReady(this.src);
		this.maps = [];
		this.motionGraph = new MotionGraph;
		this.rectMap = new Map;
		this.mapRects = new Map;
		this.mapTree = new SMTree;
		this.session = session;
		this.age = 0;
	}

	simulate(delta)
	{
		this.age += delta;
	}

	async getReady(src)
	{
		if(!cache.has(src))
		{
			cache.set(src, fetch(src));
		}

		const worldData = await (await cache.get(src)).clone().json();

		return await Promise.all(worldData.maps.map((m, i) => {

			m.fileName = new URL(m.fileName, src).href;

			const map = new TileMap({...m, session: this.session});

			this.maps[i] = map;
			this.mapRects.set(map, map.rect);
			this.rectMap.set(map.rect, map);
			this.mapTree.add(map.rect);

			return map.ready;
		}));
	}

	getMapsForPoint(x, y)
	{
		const rects = this.mapTree.query(x, y, x, y);
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
		const rects = this.mapTree.query(
			  x + -w * 0.5
			, y + -h * 0.5
			, x + w * 0.5
			, y + h * 0.5
		);

		for(const rect of rects)
		{
			result.add( this.rectMap.get(rect) );
		}

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

	getEntitiesForPoint(x, y)
	{
		const tilemaps = this.getMapsForPoint(x, y);

		let result = new Set;
		for(const tilemap of tilemaps)
		{
			if(!tilemap.visible)
			{
				continue;
			}

			const w = 500;
			const h = 500;

			const entities = tilemap.selectEntities(
				x + -w * 0.5
				, y + -h * 0.5
				, x + w * 0.5
				, y + h * 0.5
			);

			for(const entity of entities)
			{
				if(entity.rect.contains(x, y))
				{
					result.add(entity);
				}
			}
		}

		return result;
	}

	getEntitiesForRect(x, y, w, h)
	{
		const tilemaps = this.getMapsForRect(x, y, w, h);

		let result = new Set;
		for(const tilemap of tilemaps)
		{
			if(!tilemap.visible)
			{
				continue;
			}

			result = result.union(
				tilemap.selectEntities(
					  x + -w * 0.5
					, y + -h * 0.5
					, x + w * 0.5
					, y + h * 0.5
				)
			);
		}

		return result;
	}

	getRegionsForPoint(x, y)
	{
		const tilemaps = this.getMapsForPoint(x, y);

		let result = new Set;

		for(const tilemap of tilemaps)
		{
			if(!tilemap.visible)
			{
				continue;
			}

			result = result.union(tilemap.getRegionsForPoint(x, y));
		}

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
