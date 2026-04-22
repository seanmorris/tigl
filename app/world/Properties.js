/**
 * @import { TileMap } from "./TileMap";
 * @import { Entity } from "../model/Entity";
 */

/**
 * @typedef {{type: string, name: string, color: string, value: string}} TmxPropertyDef
 * @typedef {Array<TmxPropertyDef>} TmxPropertyDefList
 * @typedef {Uint8ClampedArray} Color - 4 byte color
 * @typedef {string|URL|Color} PropVal
 */

/**
 * Parses TMX-formatted Properties
 */
export class Properties
{
	/**
	 * Construct a Properties object
	 * @param {TmxPropertyDefList} properties - Raw TMX propeties
	 * @param {Entity|TileMap} owner - The owner Entity or TileMap
	 * @param {TmxPropertyDefList} defaults - Default values
	 */
	constructor(properties, owner, defaults = [])
	{
		/** @type {{[key: string]: Array<PropVal>}} */
		this.properties = {};
		this.owner = owner;
		this.add(...properties);

		for(const {name} of defaults)
		{
			if(!this.has(name)) this.add(...defaults);
		}
	}

	/**
	 * Get a property's value
	 * @param {string} name - The name of the property
	 * @param {number} index - The index of the value
	 * @returns {PropVal|void} - The value of the property
	 */
	get(name, index = 0)
	{
		if(!this.properties[name])
		{
			return;
		}

		return this.properties[name][index];
	}

	/**
	 * Check if a property exists
	 * @param {string} name - The name of the property
	 * @returns {boolean} Whether the property exists
	 */
	has(name)
	{
		return !!this.properties[name];
	}

	/**
	 * Add one or more properties
	 * @param  {TmxPropertyDefList} properties - The properties to add (TMX format)
	 */
	add(...properties)
	{
		for(const property of properties)
		{
			if(!this.properties[ property.name ])
			{
				this.properties[ property.name ] = [];
			}

			switch(property.type)
			{
				case 'color':
					this.properties[ property.name ].push(new Uint8ClampedArray([
						parseInt(property.value.substr(3 ,2), 16),
						parseInt(property.value.substr(5 ,2), 16),
						parseInt(property.value.substr(7 ,2), 16),
						parseInt(property.value.substr(1 ,2), 16),
					]));

					break;

				case 'file':
						this.properties[ property.name ].push(
							new URL(property.value, this.owner.src)
						);

						break;

				default:
					this.properties[ property.name ].push(property.value);
			}
		}
	}

	/**
	 * Get all values for a given property
	 * @param {string} name - The name of the property
	 * @returns {Array<PropVal>} - The list of values
	 */
	getAll(name)
	{
		return [...this.properties[name]];
	}
}
