import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { getArgValueByName } from '../utils/argParser.js';
import { pathResolver } from '../utils/pathResolver.js';

export const hashCompare = async (command) => {
    const algorithm = getArgValueByName(command, 'algorithm') ?? 'sha256';
    let inputPath, hashFilePath;

    try {
        const paths = await pathResolver(command, ['input', 'hash'], false);
        inputPath = paths[0];
        hashFilePath = paths[1];
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
    const expectedHash = await readFile(hashFilePath, 'utf8');
    const formattedExpectedHash = expectedHash.split(/\r?\n/)[0].toLowerCase(); // case-insensitive, ignores line breaks

    console.log(fileHash === formattedExpectedHash ? 'OK' : 'MISMATCH');
};
