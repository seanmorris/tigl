/**
 * @typedef {Uint8ClampedArray} Color - 4 byte color
 */

/**
 * Parse a color string into a set of bytes
 * @param {string | Color | number[]} colorVal
 * @returns {Color|void}
 */
export const parseColor = colorVal => {
	if(ArrayBuffer.isView(colorVal) && !(colorVal instanceof DataView))
	{
		return new Uint8ClampedArray(colorVal.buffer);
	}

	if(Array.isArray(colorVal))
	{
		return new Uint8ClampedArray(colorVal);
	}

	if(typeof colorVal === 'string')
	{
		if(colorVal[0] === '#')
		{
			colorVal = colorVal.substr(1);
		}

		if(colorVal.length === 6)
		{
			return new Uint8ClampedArray([
				parseInt(colorVal.substr(0 ,2), 16)
				, parseInt(colorVal.substr(2 ,2), 16)
				, parseInt(colorVal.substr(4 ,2), 16)
				, 255
			]);
		}

		if(colorVal.length === 8)
		{
			return new Uint8ClampedArray([
				parseInt(colorVal.substr(2 ,2), 16)
				, parseInt(colorVal.substr(4 ,2), 16)
				, parseInt(colorVal.substr(6 ,2), 16)
				, parseInt(colorVal.substr(0 ,2), 16)
			]);
		}
	}
};
