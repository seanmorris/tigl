/**
 * @import { Sprite } from "../sprite/Sprite";
 */

/**
 * @class Particle
 * Represents a particle
 */
export class Particle
{
	/**
	 * Construct a Particle object.
	 * @param {object} particleData - Named params
	 * @param {number} particleData.x - The x position of the Particle
	 * @param {number} particleData.y - The y position of the Particle
	 * @param {Sprite} particleData.sprite - The Sprite for the Particle
	 * @param {number} [particleData.frames] - The number of frames for the Particle to exist
	 * @param {(delta: number) => void} [particleData.update] - The update function for the particle
	 * @param {(delta: number) => void} [particleData.destroy] - The update function for the particle
	 */
	constructor(particleData)
	{
		this.x = particleData.x;
		this.y = particleData.y;
		this.sprite = particleData.sprite;
		this.update = particleData.update;
		this.destroy = particleData.destroy;
		this.frames = particleData.frames ?? Infinity;
	}

	/**
	 * Update the Particle
	 * @param {number} delta
	 */
	simulate(delta)
	{
		this.frames = -1 + this.frames;

		this.update && this.update(delta);

		if(this.frames <= 0)
		{
			this.destroy && this.destroy(delta);
		}

		this.sprite.x = this.x;
		this.sprite.y = this.y;
	}
}
