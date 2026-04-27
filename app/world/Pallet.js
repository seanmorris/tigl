/**
 * @import { SpawnClass } from "../model/Entity";
 */

/**
 * Represents a Pallet to select classes by a predefined string
 */
export class Pallet
{
	/**
	 * @type {{[key: string]: SpawnClass}} objectPallet - Stores the classes by typeName
	 */
	objectPallet = {};

	/**
	 * Resolve a class by `typeName`
	 * @param {string} typeName - The string that refers to a class in the Pallet
	 * @returns {Promise<SpawnClass>} - The class
	 */
	async resolve(typeName)
	{
		if(typeName[0] === '@')
		{
			if(this.objectPallet[ typeName ])
			{
				return this.objectPallet[ typeName ];
			}
		}
		else if(typeName === 'http://' || typeName === 'https://')
		{
			return (await import(/* webpackIgnore: true */typeName)).default;
		}
	}

	/**
	 * Resolve a class by `typeName`
	 * @param {string} typeName - The string that refers to a class in the Pallet
	 * @param {SpawnClass} spawnClass - The class to register
	 */
	register(typeName, spawnClass)
	{
		if(this.objectPallet[typeName])
		{
			console.warn(`Overwriting spawnclass!`);
		}

		this.objectPallet[typeName] = spawnClass;
	}
}
