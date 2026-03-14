import { createReadStream, createWriteStream, constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { getArgValueByName } from '../utils/argParser.js';
import { getCurrentWorkingDir } from '../navigation.js';

export const jsonToCsv = async (command) => {
    const inputArgValue = getArgValueByName(command, 'input');
    const outputArgValue = getArgValueByName(command, 'output');

    if (!inputArgValue || !outputArgValue) {
        console.log('Invalid input. Please provide --input and --output arguments.');
        return;
    }

    const inputPath = path.resolve(getCurrentWorkingDir(), inputArgValue);
    const outputPath = path.resolve(getCurrentWorkingDir(), outputArgValue);

    const fileExists = await access(inputPath)
        .then(() => true)
        .catch(() => false);
    if (!fileExists) {
        console.log('Operation failed');
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
