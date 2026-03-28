import { createDecipheriv, scrypt } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { getArgValueByName } from '../utils/argParser.js';
import { pathResolver } from '../utils/pathResolver.js';

const printError = () => {
    console.log('Operation failed');
}

export const decrypt = async (command) => {
    const algorithm = 'aes-256-gcm';
    const password = getArgValueByName(command, 'password');
    const headerSize = 28; // 16 bytes salt + 12 bytes iv
    const authTagSize = 16;
    let inputPath, outputPath;

    try {
        const paths = await pathResolver(command, ['input', 'output']);
        inputPath = paths[0];
        outputPath = paths[1];
    } catch (error) {
        return;
    }

    if (!password) {
        console.log('Invalid input. Please provide --password.');
        return;
    }

    const inputFileStats = await stat(inputPath).catch(() => null);
    if (inputFileStats.size < headerSize + authTagSize) {
        printError();
        return;
    }

    const readRangeOfBytes = (start, end) => new Promise((resolve, reject) => {
        const chunks = [];
        const stream = createReadStream(inputPath, { start, end });
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

    let headerBuffer;
    let authTagBuffer;
    try {
        headerBuffer = await readRangeOfBytes(0, headerSize - 1); // extracting salt and iv 
        authTagBuffer = await readRangeOfBytes(inputFileStats.size - authTagSize, inputFileStats.size - 1);
    } catch {
        printError();
        return;
    }

    const salt = headerBuffer.subarray(0, 16);
    const iv = headerBuffer.subarray(16, 28);

    const scryptAsync = promisify(scrypt);
    let key;
    try {
        key = await scryptAsync(password, salt, 32);
    } catch {
        printError();
        return;
    }

    const decipher = createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTagBuffer);

    const input = createReadStream(inputPath, {
        start: headerSize,
        end: inputFileStats.size - authTagSize - 1,
    });
    const output = createWriteStream(outputPath);

    await pipeline(input, decipher, output).catch(() => {
        printError();
    });
}
