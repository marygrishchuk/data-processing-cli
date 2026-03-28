import { createReadStream, createWriteStream } from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathResolver } from '../utils/pathResolver.js';

export const jsonToCsv = async (command) => {
    let inputPath, outputPath;
    try {
        const paths = await pathResolver(command, ['input', 'output']);
        inputPath = paths[0];
        outputPath = paths[1];
    } catch (error) {
        return;
    }

    const readStream = createReadStream(inputPath, { encoding: 'utf8' });
    const writeStream = createWriteStream(outputPath, { encoding: 'utf8' });

    let jsonBuffer = '';
    const toCsvTransform = new Transform({
        decodeStrings: false,
        transform(chunk, _encoding, callback) {
            jsonBuffer += chunk;
            callback();
        },
        flush(callback) {
            const dataArray = JSON.parse(jsonBuffer);
            if (!Array.isArray(dataArray) || !dataArray.length) {
                console.log('Operation failed');
                callback();
                return;
            }

            const headers = Object.keys(dataArray[0]).join(',');
            this.push(`${headers}\n`);
            dataArray.forEach((dataObj, index) => {
                const row = Object.values(dataObj).join(',');
                const lineBreak = index === dataArray.length - 1 ? '' : '\n';
                this.push(`${row}${lineBreak}`);
            });
            callback();
        },
    });

    await pipeline(readStream, toCsvTransform, writeStream).catch(() => {
        console.log('Operation failed');
    });
};
