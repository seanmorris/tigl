import { Bindable } from 'curvature/base/Bindable';
import { MotionGraph } from '../math/MotionGraph';
import { TileMap } from './TileMap';
import { SMTree } from '../math/SMTree';
import { Ray } from "../math/Ray";
import { Entity } from '../model/Entity';

/**
 * @import { Region } from "../sprite/Region"
 * @import { Session } from "../session/Session"
 * @import { Rectangle } from "../math/Rectangle"
 * @import { RaycastResult, TerrainScanResult, EntityScanResult } from "../math/Ray"
 */

/**
 * @typedef {{
 *   async: boolean,
 *   maps: {
 *     fileName: string|URL,
 *   }[]
 * }} TmxWorldDef
 */

const cache = new Map;

/**
 * Represents a world of multiples TileMaps
 * @property {string|URL} src - The URL of the World data to load
 * @property {Promise<void>} ready - Resolves when the World is loaded & ready
 * @property {Array<TileMap>} maps - Tilemaps in the world
 * @property {MotionGraph} motionGraph - The MotionGraph of the World
 * @property {Map<Rectangle,TileMap>} mapRects - The Rectangles of the TileMaps
 * @property {SMTree} mapTree - The SMTree for the TileMaps
 * @property {Session} session - The current Session
 * @property {boolean} async - Whether we're loading asyncronously
 * @property {number} age - How old the World is in ms
 */
export class World
{
	/**
	 * Construct a World object
	 * @param {object} param0 - Named Params
	 * @param {string|URL} param0.src - The URL of the World data to load
	 * @param {Session} param0.session - The current Session
	 */
	constructor({src, session})
	{
		// this[Bindable.Prevent] = true;
		this.src = new URL(src, location.href);
		this.ready = this.getReady(this.src);

		/** @type {TileMap[]} */
		this.maps = [];

		this.motionGraph = new MotionGraph;
		this.rectMap = new Map;
		this.mapRects = new Map;
		this.mapTree = new SMTree;
		this.session = session;
		this.async = false;
		this.age = 0;
	}


	/**
	 * Tick the World's simulation logic once.
	 * @param {number} delta - MS since last tick
	 */
	simulate(delta)
	{
		this.age += delta;
	}

	/**
	 * Load & initialize the world from a URL
	 * @param {string|URL} src - The URL of the World data to load
	 * @returns {Promise<Promise<*>>}
	 */
	async getReady(src)
	{
		if(!cache.has(src))
		{
			cache.set(src, fetch(src));
		}

		/** @type {TmxWorldDef} */
		const worldData = await (await cache.get(src)).clone().json();

		return await Promise.all(worldData.maps.map((m, i) => {

			m.fileName = new URL(m.fileName, src).href;

			const map = new TileMap({...m, session: this.session});

			this.maps[i] = map;
			this.mapRects.set(map, map.rect);
			this.rectMap.set(map.rect, map);
			this.mapTree.add(map.rect);

			if(!worldData.async || map.props.has('player-start'))
			{
				return map.initialize();
			}

			return Promise.resolve();
		}));
	}

	/**
	 * Get maps for a given point
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @returns {Set<TileMap>} - The TileMaps at the point
	 */
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

	/**
	 * Get maps for a given rectangle
	 * @param {number} x - The x value of the top/left of the rectangle
	 * @param {number} y - The y value of the top/left of the rectangle
	 * @param {number} w - The width of the rectangle
	 * @param {number} h - The height of the rectangle
	 * @returns {Set<TileMap>} - The TileMaps in the rectangle
	 */
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

	/**
	 * Check if a given point is solid or space
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @param {number} z - The layer id to check
	 * @returns {Set<Entity>|number|boolean|null|void} - The Set of Entities at the point, or the tile ID at the point (if solid), or false if space
	 */
	getSolid(x, y, z)
	{
		const terrain = this.getSolidTerrain(x, y, z);
		if(terrain) return terrain;

		const solidEntities = this.getEntitiesForPoint(x, y, Entity.E_SOLID);
		if(solidEntities.size) return solidEntities;
	}

	/**
	 * Check if a given point is solid TERRAIN or space
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @param {number} z - The layer id to check
	 * @returns {number|boolean|null} - The tile ID at the point (if solid), false if space
	 */
	getSolidTerrain(x, y, z)
	{
		const maps = this.getMapsForPoint(x, y);

		for(const map of maps)
		{
			const solid = map.getSolid(x, y, z);

			if(solid === false) continue;

			if(solid === true || solid > 0)
			{
				return solid;
			}
		}

		return null;
	}

	/**
	 * Get the collision tile for a given point
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @param {number} z - The layer id to check
	 * @returns {number|boolean|null} The tile at the point or null if no tile exists there
	 */
	getCollisionTile(x, y, z)
	{
		const maps = this.getMapsForPoint(x, y);

		for(const map of maps)
		{
			const tile = map.getCollisionTile(x, y, z);

			if(tile === false) continue;

			if(tile === true || tile > 0)
			{
				return tile;
			}
		}

		return null;
	}

	/**
	 * Get Entities for a given point
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @param {number} entiyFlags - Bitwise filter
	 * @returns {Set<Entity>} - The Entities at the given point
	 */
	getEntitiesForPoint(x, y, entiyFlags = 0)
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
				if(entiyFlags && !(entity.flags & entiyFlags))
				{
					continue;
				}

				if(entity.rect.contains(x, y))
				{
					result.add(entity);
				}
			}
		}

		return result;
	}

	/**
	 * Get Entities for a given rectangle
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @param {number} w - The width of the rectangle
	 * @param {number} h - The height of the rectangle
	 * @returns {Set<Entity>} - The Entities in the given rectangle
	 */
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

	/**
	 * Get Regions for a given point
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @returns {Set<Region>} - The Regions at the point
	 */
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

			result = result.union(
				tilemap.getRegionsForPoint(x, y)
			);
		}

		return result;
	}

	/**
	 * Get Regions for a given rectangle
	 * @param {number} x - The x value of the point
	 * @param {number} y - The y value of the point
	 * @param {number} w - The width of the rectangle
	 * @param {number} h - The height of the rectangle
	 * @returns {Set<Region>} - The Regions in the given rectangle
	 */
	getRegionsForRect(x, y, w, h)
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
				tilemap.getRegionsForRect(
					x + -w * 0.5
					, y + -h * 0.5
					, x + w * 0.5
					, y + h * 0.5
				)
			);
		}

		return result;
	}

	/**
	 * Cast a Ray through the World
	 * @param {number} startX - The x value of the start point
	 * @param {number} startY - The y value of the start point
	 * @param {number} endX - The x value of the end point
	 * @param {number} endY - The y value of the end point
	 * @param {number} rayFlags - flags to affect raycast behavior
	 * @param {number} layerId - The id of the layer to scan
	 * @returns {RaycastResult} - The result of the raycast
	 */
	castRay(startX, startY, endX, endY, rayFlags = Ray.DEFAULT_FLAGS, layerId = 0)
	{
		return Ray.cast(
			this
			, startX
			, startY
			, endX
			, endY
			, rayFlags
			, layerId
		);
	}

	/**
	 * Scan for terrain along a Ray in the World
	 * @param {number} startX - The x value of the start point
	 * @param {number} startY - The y value of the start point
	 * @param {number} endX - The x value of the end point
	 * @param {number} endY - The y value of the end point
	 * @param {number} rayFlags - flags to affect raycast behavior
	 * @param {number} layerId - The id of the layer to scan
	 * @returns {TerrainScanResult} - The result of the raycast
	 */
	castTerrainRay(startX, startY, endX, endY, rayFlags = Ray.DEFAULT_FLAGS, layerId = 0)
	{
		return Ray.castTerrain(
			this
			, startX
			, startY
			, endX
			, endY
			, rayFlags
			, layerId
		);
	}

	/**
	 * Scan for Entities along a Ray in the World
	 * @param {number} startX - The x value of the start point
	 * @param {number} startY - The y value of the start point
	 * @param {number} endX - The x value of the end point
	 * @param {number} endY - The y value of the end point
	 * @param {number} rayFlags - flags to affect raycast behavior
	 * @returns {EntityScanResult} - The result of the raycast
	 */
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
