import { createReadStream, createWriteStream, constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { getArgValueByName } from '../utils/argParser.js';
import { getCurrentWorkingDir } from '../navigation.js';

export const csvToJson = async (command) => {
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

    let headers;
    let remainder = '';
    let started = false;
    let isFirstObject = true;

    const pushJsonObjectHelper = (values, transformInstance) => {
        const resultObject = {};
        headers.forEach((header, index) => resultObject[header] = values[index] ?? '');

        if (!started) {
            transformInstance.push('[\n');
            started = true;
        }
        if (!isFirstObject) {
            transformInstance.push(',\n');
        }
        const json = JSON.stringify(resultObject, null, 2);
        transformInstance.push(`  ${json.replace(/\n/g, '\n  ')}`);
        isFirstObject = false;
    }

    const toJsonTransform = new Transform({
        decodeStrings: false,
        transform(chunk, _encoding, callback) {
            const data = remainder + chunk;
            const lines = data.split(/\r?\n/);
            remainder = lines.pop() ?? '';

            for (const line of lines) {
                if (line.length === 0) continue;
                if (!headers) {
                    headers = line.split(',');
                    continue;
                }

                const values = line.split(',');
                pushJsonObjectHelper(values, this);
            }
            callback();
        },
        flush(callback) {
            const finalLine = remainder.trim();
            if (finalLine.length > 0) {
                if (!headers) {
                    headers = finalLine.split(',');
                } else {
                    const values = finalLine.split(',');
                    pushJsonObjectHelper(values, this);
                }
            }
            this.push(started ? '\n]' : '[]');
            callback();
        },
    });

    await pipeline(readStream, toJsonTransform, writeStream).catch(() => {
        console.log('Operation failed');
    });
};
