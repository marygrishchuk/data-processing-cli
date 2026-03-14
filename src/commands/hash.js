import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { getCurrentWorkingDir } from '../navigation.js';
import { getArgValueByName } from '../utils/argParser.js';

export const hash = async (command) => {
    const inputArgValue = getArgValueByName(command, 'input');
    const algorithm = getArgValueByName(command, 'algorithm') ?? 'sha256';
    const isSaveProvided = command.includes('--save');

    if (!inputArgValue) {
        console.log('Invalid input. Please provide --input.');
        return;
    }
    if (!['sha256', 'md5', 'sha512'].includes(algorithm)) {
        console.log('Operation failed');
        return;
    }

    const inputPath = path.resolve(getCurrentWorkingDir(), inputArgValue);
    const outputPath = path.resolve(getCurrentWorkingDir(), `${inputArgValue}.${algorithm}`);

    const fileExists = await access(inputPath)
        .then(() => true)
        .catch(() => false);
    if (!fileExists) {
        console.log('Operation failed');
        return;
    }

    const readStream = createReadStream(inputPath, { encoding: 'utf8' });

    const hash = createHash(algorithm);
    await pipeline(readStream, hash);
    const fileHash = hash.digest('hex');

    if (!isSaveProvided) {
        console.log(`${algorithm}: ${fileHash}`);
    } else {
        createWriteStream(outputPath, { encoding: 'utf8' }).end(fileHash);
    }
};
