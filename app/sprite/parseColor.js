export const parseColor = colorString => {
	if(colorString[0] === '#')
	{
		colorString = colorString.substr(1);
	}

	if(colorString.length === 6)
	{
		return new Uint8ClampedArray([
			parseInt(colorString.substr(0 ,2), 16),
			parseInt(colorString.substr(2 ,2), 16),
			parseInt(colorString.substr(4 ,2), 16),
			255,
		]);
	}

	if(colorString.length === 8)
	{
		return new Uint8ClampedArray([
			parseInt(colorString.substr(2 ,2), 16),
			parseInt(colorString.substr(4 ,2), 16),
			parseInt(colorString.substr(6 ,2), 16),
			parseInt(colorString.substr(0 ,2), 16),
		]);
	}
};