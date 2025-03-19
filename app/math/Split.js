export class Split
{
	static bytes = new Uint8ClampedArray(4);
	static words = new Uint16Array(this.bytes.buffer);
	static value = new Uint32Array(this.bytes.buffer);

	static intToBytes(value)
	{
		this.value[0] = value;

		return [...this.bytes];
	}
}
