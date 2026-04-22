/**
 * Represents a gamepad button
 */
export class Button
{
	/**
	 * @property {boolean} active - Whether the button is pressed
	 */
	active = false;

	/**
	 * @property {number} pressure - How hard the button is pressed
	 */
	pressure = 0;

	/**
	 * @property {number} delta - How much the pressure changed on the last tick
	 */
	delta = 0;

	/**
	 * @property {number} time - How long has the button been pressed (ticks)
	 */
	time = 0;

	/**
	 * Update the state of the button by one tick
	 */
	update()
	{
		if(this.pressure)
		{
			this.time++;
		}
		else if(!this.pressure && this.time > 0)
		{
			this.time = -1;
		}
		else if(!this.pressure && this.time < 0)
		{
			this.time--;
		}

		if(this.time < -1 && this.delta === -1)
		{
			this.delta = 0;
		}
	}

	/**
	 * Press the button to a given pressure level
	 * @param {number} pressure - The new pressure level
	 */
	press(pressure)
	{
		this.delta    = Number(Number(pressure - this.pressure).toFixed(3));
		this.pressure = Number(Number(pressure).toFixed(3));
		this.active   = true;
		this.time     = this.time > 0 ? this.time : 0;
	}

	/**
	 * Release the button
	 */
	release()
	{
		// if(!this.active)
		// {
		// 	return;
		// }

		this.delta    = Number(Number(-this.pressure).toFixed(3));
		this.pressure = 0;
		this.active   = false;
	}

	/**
	 * Reset the button
	 */
	zero()
	{
		this.pressure = this.delta = 0;
		this.active   = false;
	}
}
