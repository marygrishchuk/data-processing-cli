import { createCipheriv, randomBytes, scrypt } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { getCurrentWorkingDir } from '../navigation.js';
import { getArgValueByName } from '../utils/argParser.js';

const printError = () => {
    console.log('Operation failed');
}

export const encrypt = async (command) => {
    const algorithm = 'aes-256-gcm';
    const password = getArgValueByName(command, 'password');
    const inputArgValue = getArgValueByName(command, 'input');
    const outputArgValue = getArgValueByName(command, 'output');

    if (!inputArgValue || !outputArgValue || !password) {
        console.log('Invalid input. Please provide --input, --output and --password.');
        return;
    }

    const inputPath = path.resolve(getCurrentWorkingDir(), inputArgValue);
    const outputPath = path.resolve(getCurrentWorkingDir(), outputArgValue);

    const isInputPathValid = await access(inputPath).then(() => true).catch(() => false);
    if (!isInputPathValid) {
        printError();
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
                this.push(cipher.getAuthTag());
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
