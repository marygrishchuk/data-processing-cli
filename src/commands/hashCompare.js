import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { getCurrentWorkingDir } from '../navigation.js';
import { getArgValueByName } from '../utils/argParser.js';

export const hashCompare = async (command) => {
    const inputArgValue = getArgValueByName(command, 'input');
    const hashFileArgValue = getArgValueByName(command, 'hash');
    const algorithm = getArgValueByName(command, 'algorithm') ?? 'sha256';

    if (!inputArgValue || !hashFileArgValue) {
        console.log('Invalid input. Please provide --input and --hash.');
        return;
    }
    if (!['sha256', 'md5', 'sha512'].includes(algorithm)) {
        console.log('Operation failed');
        return;
    }

    const inputPath = path.resolve(getCurrentWorkingDir(), inputArgValue);
    const hashFilePath = path.resolve(getCurrentWorkingDir(), hashFileArgValue);

    const isInputPathValid = await access(inputPath).then(() => true).catch(() => false);
    const isHashPathValid = await access(hashFilePath).then(() => true).catch(() => false);
    if (!isInputPathValid || !isHashPathValid) {
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
