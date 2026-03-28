import { createReadStream } from 'node:fs';
import { pathResolver } from '../utils/pathResolver.js';

export const count = async (command) => {
    let inputPath;
    try {
        const paths = await pathResolver(command, ['input']);
        inputPath = paths[0];
    } catch (error) {
        return;
    }

    const readStream = createReadStream(inputPath, { encoding: 'utf8' });

    let linesCount = 0, wordsCount = 0, charsCount = 0, remainder = '';

    return new Promise((resolve, reject) => {
        readStream.on('data', chunk => {
            const data = remainder + chunk.toString();
            const lines = data.split(/\r?\n/);
            if (lines.length > 1) {
                remainder = lines.pop() ?? '';
            } else {
                remainder = lines[0] ?? '';
                return;
            }

            linesCount += lines.length;
            wordsCount += lines.join(' ').split(' ').length;
            charsCount += lines.join('').length;
        });
        readStream.on('end', () => {
            if (remainder) {
                linesCount++;
                wordsCount += remainder.split(' ').length;
                charsCount += remainder.length;
            }
            console.log(`Lines: ${linesCount}\nWords: ${wordsCount}\nCharacters: ${charsCount}`);
            resolve();
        });
        readStream.on('error', reject);
    });
};
