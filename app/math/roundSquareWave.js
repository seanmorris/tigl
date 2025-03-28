export const roundedSquareWave = (x, r = 0) => {
	r = Math.min(1, Math.max(0, r));
	const b = Math.round(10 * (1 - r));
	const c = b ** 3 + 4;
	const i = Math.cos( Math.sin( (Math.PI / 2) + x * Math.PI) ** (1 + b) ) ** c;
	const j = 1 + -( Math.cos( Math.sin( x * Math.PI ) ** (1 + b) ) ** c);

	return (i + j) * 0.5;
}