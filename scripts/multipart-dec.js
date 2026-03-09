#!/usr/bin/env node

import fs from 'node:fs';
const dec = new TextDecoder;
const enc = new TextEncoder;

class HwadLoader
{
	hwads = new Set;

	getInfo(name, index = 0)
	{
		for(const hwad of this.hwads)
		{
			if(hwad.has(name))
			{
				return hwad.get(name, index);
			}
		}
	}

	readInfo(name, index)
	{
		const chunk = this.getInfo(name, index);

		if(chunk)
		{
			return chunk.text();
		}
	}

	getAsset(filename)
	{
		for(const hwad of this.hwads)
		{
			if(hwad.hasFile(filename))
			{
				return hwad.getFile(filename);
			}
		}
	}

	readAsset(filename)
	{
		const chunk = this.getAsset(filename);

		console.log(chunk);

		if(chunk)
		{
			return chunk.text();
		}
	}

	add(...hwads)
	{
		hwads.map(hwad => this.hwads.add(hwad));
	}
}

class Hwad
{
	static parse(buffer)
	{
		const hwadBytes = new Uint8Array(buffer);

		const hwadData = {
			type: null,
			boundary: null,
			chunks: [],
		};

		let chunk;

		const cr = '\r'.charCodeAt(0);
		const lf = '\n'.charCodeAt(0);

		const headerLine = 'Content-Type: multipart/form-data; boundary=';
		const dispHeader = 'Content-Disposition: ';
		const typeHeader = 'Content-Type: ';
		const b = 'boundary=';

		let chunkData = new Uint8Array;
		let currentBytes = [];

		let i = 0;
		let r = 0;
		let c = 0;

		while(i < hwadBytes.length)
		{
			const crIndex = hwadBytes.indexOf(cr, i);
			const lineBytes = hwadBytes.slice(i, crIndex + 2);

			if(crIndex === -1)
			{
				break;
			}

			currentBytes = lineBytes;

			const line = dec.decode(currentBytes);

			i = 2 + crIndex;

			if(r === 0)
			{
				if(line === '\r\n')
				{
					if(!hwadData.boundary)
					{
						throw new Error('Unexpected File Header!');
					}

					r = 1;
					continue;
				}

				if(headerLine === line.slice(0, headerLine.length))
				{
					const typeIndex = line.indexOf(typeHeader) + typeHeader.length;
					hwadData.type = line.slice(typeIndex, line.indexOf(';', typeIndex));
					hwadData.boundary = line.slice(line.indexOf(b) + b.length, -2 + i);
				}
			}
			else
			{
				if(c === 0)
				{
					if(line === '\r\n')
					{
						c = 1;
						continue;
					}

					chunk = chunk || {};

					if(dispHeader === line.slice(0, dispHeader.length))
					{
						const sep = line.indexOf('; ');
						const disposition = line.slice(dispHeader.length, sep);

						const nameKey = ' name="';
						const fileKey = ' filename="'

						const nameSep = line.indexOf(nameKey, sep);
						const filenameSep = line.indexOf(fileKey, sep);

						const name = nameSep >= 0
							? line.slice(nameKey.length + nameSep, line.indexOf('"', nameKey.length + nameSep))
							: null;

						const filename = filenameSep >=0
							? line.slice(fileKey.length + filenameSep, line.indexOf('"', fileKey.length + filenameSep))
							: null;

						chunk.name = name;
						chunk.filename = filename;
						chunk.disposition = disposition;
						continue;
					}

					if(typeHeader === line.slice(0, typeHeader.length))
					{
						const typeIndex = line.indexOf(typeHeader) + typeHeader.length;
						chunk.type = line.slice(typeIndex, line.indexOf(';', typeIndex));
						continue;
					}
				}
				else
				{
					if(line === '--' + hwadData.boundary + '\r\n' || line === '--' + hwadData.boundary + '--\r\n')
					{
						if(chunk)
						{
							chunk.data = chunkData.slice(0, -2);
							chunkData = new Uint8Array;
							hwadData.chunks.push(new HwadChunk(chunk));
							chunk = {}
							c = 0;
						}

						continue;
					}

					chunkData = new Uint8Array([...chunkData, ...currentBytes]);
				}
			}
		}

		return new Hwad(hwadData);
	}

	serialize()
	{

		const fileHeader  = b => `Content-Type: multipart/form-data; boundary=${b}\r\n`;
		const chunkHeader = n => `Content-Disposition: form-data; filename="${n}"\r\n\r\n`;

		const boundary = '-HwadFormBoundary';

		let bytes = enc.encode(fileHeader(this.boundary));

		for(const chunk of this.chunks)
		{
			bytes = new Uint8Array([
				...bytes
				, ...enc.encode('\r\n--' + this.boundary + '\r\n')
				, ...enc.encode(chunkHeader(chunk.filename))
				, ...chunk.data
			]);
		}

		return new Uint8Array([...bytes, ...enc.encode('\r\n--' + boundary + '--\r\n')]);
	}

	constructor({type, boundary, chunks = []})
	{
		this.type = type;
		this.boundary = boundary;

		this.chunks = [...chunks];
		this.nameMap = new Map;
		this.fileMap = new Map;

		for(const chunk of chunks)
		{
			if(chunk.name)
			{
				if(!this.nameMap.has(chunk.name))
				{
					this.nameMap.set(chunk.name, []);
				}

				this.nameMap.get(chunk.name).push(chunk);
			}

			if(chunk.filename)
			{
				if(!this.fileMap.has(chunk.filename))
				{
					this.fileMap.set(chunk.filename, []);
				}

				this.fileMap.get(chunk.filename).push(chunk);
			}
		}

		Object.freeze(this);
	}

	[Symbol.iterator]()
	{
		return this.chunks[Symbol.iterator]();
	}

	has(name)
	{
		return this.nameMap.has(name);
	}

	hasFile(filename)
	{
		return this.fileMap.has(filename);
	}

	get(name, index = 0)
	{
		if(!this.nameMap.has(name))
		{
			return;
		}

		const chunks = this.nameMap.get(name);

		if(index >= chunks.length)
		{
			return;
		}

		return chunks[index];
	}

	getFile(filename, index = 0)
	{
		if(!this.fileMap.has(filename))
		{
			return;
		}

		const chunks = this.fileMap.get(filename);

		if(index >= chunks.length)
		{
			return;
		}

		return chunks[index];
	}
}

class HwadChunk
{
	constructor({name, filename, disposition, type, data})
	{
		this.name = name;
		this.filename = filename;
		this.disposition = disposition;
		this.type = type;
		this.data = new Uint8Array(data ?? []);
		this.size = data ? data.length : 0;

		Object.freeze(this);
	}

	text()
	{
		return dec.decode(this.data);
	}

	file()
	{
		return new File([this.data], this.filename, {type: this.type});
	}
}

const loadFiles = (...files) => files.map(file =>new Uint8Array(fs.readFileSync(file)));
const loader = new HwadLoader;
const hwads = loadFiles('./test.hwad', './test2.hwad', './test3.hwad').map(file => Hwad.parse(file));

// hwads.forEach(h => console.log(h));

loader.add(...hwads);

// console.log(hwads[1]);
// console.log(hwads[2]);

const info = loader.readAsset('README.md');
const info2 = hwads[2].getFile('README.md');

console.log(info, info2);

// const chunk = loader.getAsset('app/assets/barrel.png');
// console.log(chunk);

// fs.writeFileSync('./test3.hwad', hwads[1].serialize());

