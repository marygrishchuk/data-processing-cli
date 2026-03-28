import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { getCurrentWorkingDir } from '../navigation.js';
import { getArgValueByName } from '../utils/argParser.js';
import { pathResolver } from '../utils/pathResolver.js';

export const hash = async (command) => {
    const algorithm = getArgValueByName(command, 'algorithm') ?? 'sha256';
    const isSaveProvided = command.includes('--save');
    let inputPath, inputArgValue;

    try {
        const data = await pathResolver(command, ['input'], true, true);
        inputPath = data.resolvedPaths[0];
        inputArgValue = data.pathArgValues[0];
    } catch (error) {
        return;
    }

    if (!['sha256', 'md5', 'sha512'].includes(algorithm)) {
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
        const outputPath = path.resolve(getCurrentWorkingDir(), `${inputArgValue}.${algorithm}`);
        createWriteStream(outputPath, { encoding: 'utf8' }).end(fileHash);
    }
};
