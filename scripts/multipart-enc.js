#!/usr/bin/env node

import fs from 'node:fs';

const argv = process.argv.slice(2);

const fileHeader  = b => `Content-Type: multipart/form-data; boundary=${b}\r\n`;
const chunkHeader = n => `Content-Disposition: form-data; filename="${n}"\r\n\r\n`;

const enc = new TextEncoder;
const boundary = '-HwadFormBoundary';

let bytes = enc.encode(fileHeader(boundary));

for(const filename of argv)
{
	const content = new Uint8Array(fs.readFileSync(filename));

	bytes = new Uint8Array([
		...bytes
		, ...enc.encode('\r\n--' + boundary + '\r\n')
		, ...enc.encode(chunkHeader(filename))
		, ...content
	]);
}

bytes = new Uint8Array([...bytes, ...enc.encode('\r\n--' + boundary + '--\r\n')]);

fs.writeFileSync('./test2.hwad', bytes);
