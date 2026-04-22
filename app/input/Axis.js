/**
 * Represents a gamepad axis
 */
export class Axis
{
	/**
	 * @property {number} magnitude - How far the axis is tilted.
	 */
	magnitude = 0;

	/**
	 * @property {number} delta - How much the axis changed on the last tick
	 */
	delta = 0;

	/**
	 * Connstruct an Axis object
	 * @param {object} param0 - Named params
	 * @param {number} param0.deadZone - The size of the Axis' deadzone (inputs below this level are ignored)
	 * @param {boolean} [param0.proportional] - UNUSED
	 */
	constructor({deadZone = 0, proportional = true})
	{
		if(deadZone)
		{
			this.proportional = proportional;
			this.deadZone     = deadZone;
		}
	}

	/**
	 * Tilt the Axis to a given value
	 * @param {number} magnitude - Where to move the Axis' tilt to
	 */
	tilt(magnitude)
	{
		if(this.deadZone && Math.abs(magnitude) >= this.deadZone)
		{
			magnitude = (Math.abs(magnitude) - this.deadZone) / (1 - this.deadZone) * Math.sign(magnitude);
		}
		else
		{
			magnitude = 0;
		}

		this.delta     = Number(Number(magnitude - this.magnitude).toFixed(3));
		this.magnitude = Number(Number(magnitude).toFixed(3));
	}

	/**
	 * Center the Axis
	 */
	zero()
	{
		this.magnitude = this.delta = 0;
	}
}
