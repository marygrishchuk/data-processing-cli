import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { getCurrentWorkingDir } from '../navigation.js';
import { getArgValueByName } from '../utils/argParser.js';

export const count = async (command) => {
    const inputArgValue = getArgValueByName(command, 'input');

    if (!inputArgValue) {
        console.log('Invalid input. Please provide --input argument.');
        return;
    }

    const inputPath = path.resolve(getCurrentWorkingDir(), inputArgValue);

    const fileExists = await access(inputPath)
        .then(() => true)
        .catch(() => false);
    if (!fileExists) {
        console.log('Operation failed');
        return;
    }

    const readStream = createReadStream(inputPath, { encoding: 'utf8' });

    let linesCount = 0, wordsCount = 0, charsCount = 0, remainder = '';

    readStream.on('data', chunk => {
        const data = remainder + chunk.toString();
        const lines = data.split(/\r?\n/);
        if (lines.length > 1) {
            remainder = lines.pop() ?? '';
        }

        linesCount += lines.length;
        wordsCount += data.split(' ').length;
        charsCount += lines.join('').length;
    })
    readStream.on('end', () => {
        if (remainder) {
            linesCount++;
            wordsCount += remainder.split(' ').length;
            charsCount += remainder.length;
        }
        console.log(`Lines: ${linesCount}\nWords: ${wordsCount}\nCharacters: ${charsCount}\n`);
    });
};
