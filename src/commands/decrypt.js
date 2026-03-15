import { createDecipheriv, scrypt } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { getCurrentWorkingDir } from '../navigation.js';
import { getArgValueByName } from '../utils/argParser.js';

const printError = () => {
    console.log('Operation failed');
}

export const decrypt = async (command) => {
    const algorithm = 'aes-256-gcm';
    const password = getArgValueByName(command, 'password');
    const inputArgValue = getArgValueByName(command, 'input');
    const outputArgValue = getArgValueByName(command, 'output');
    const headerSize = 28; // 16 bytes salt + 12 bytes iv
    const authTagSize = 16;

    if (!inputArgValue || !outputArgValue || !password) {
        console.log('Invalid input. Please provide --input, --output and --password.');
        return;
    }

    const inputPath = path.resolve(getCurrentWorkingDir(), inputArgValue);
    const outputPath = path.resolve(getCurrentWorkingDir(), outputArgValue);

    const inputFileStats = await stat(inputPath).catch(() => null);
    if (!inputFileStats || inputFileStats.size < headerSize + authTagSize) {
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
