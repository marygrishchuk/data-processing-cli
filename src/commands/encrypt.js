import { createCipheriv, randomBytes, scrypt } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { getArgValueByName } from '../utils/argParser.js';
import { pathResolver } from '../utils/pathResolver.js';

const printError = () => {
    console.log('Operation failed');
}

export const encrypt = async (command) => {
    const algorithm = 'aes-256-gcm';
    const password = getArgValueByName(command, 'password');
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

    const scryptAsync = promisify(scrypt);
    const salt = randomBytes(16);
    const iv = randomBytes(12);

    let key;
    try {
        key = await scryptAsync(password, salt, 32);
    } catch {
        printError();
        return;
    }

    const cipher = createCipheriv(algorithm, key, iv);
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);

    output.write(Buffer.concat([salt, iv]));

    const authTagAppender = new Transform({
        transform(chunk, _encoding, callback) {
            callback(null, chunk);
        },
        flush(callback) {
            try {
                this.push(cipher.getAuthTag()); // 16 bytes
                callback();
            } catch (error) {
                callback(error);
            }
        },
    });

    await pipeline(input, cipher, authTagAppender, output).catch(() => {
        printError();
    });
}
