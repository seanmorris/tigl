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

	static bytesToInt(bytes)
	{
		this.bytes[0] = bytes[0];
		this.bytes[1] = bytes[1];
		this.bytes[2] = bytes[2];
		this.bytes[3] = bytes[3];

		return this.value[0];
	}

	static bytesToInt3(bytes)
	{
		this.bytes[0] = bytes[0];
		this.bytes[1] = bytes[1];
		this.bytes[2] = bytes[2];
		this.bytes[3] = 0;

		return this.value[0];
	}
}
