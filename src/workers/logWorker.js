import { createReadStream } from 'node:fs';
import { parentPort, workerData } from 'worker_threads';

const { inputPath, start, end } = workerData;

const levels = {};
const status = {};
const paths = {};
let total = 0;
let responseTimeSum = 0;
let remainder = '';

const incrementCountByKey = (target, key) => {
    target[key] = (target[key] ?? 0) + 1;
};

const processLine = (line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;
    const parts = trimmedLine.split(/\s+/);
    if (parts.length < 7) return; // 7 is the number of items per line

    const level = parts[1];
    const statusCode = Number.parseInt(parts[3], 10);
    const responseTime = Number.parseFloat(parts[4]);
    const path = parts[6];

    if (Number.isNaN(statusCode) || Number.isNaN(responseTime)) return;

    total += 1;
    responseTimeSum += responseTime;
    incrementCountByKey(levels, level);
    const statusKey = `${Math.floor(statusCode / 100)}xx`;
    incrementCountByKey(status, statusKey);
    incrementCountByKey(paths, path);
};

const readStream = createReadStream(inputPath, { start, end, encoding: 'utf8' });

readStream.on('data', (chunk) => {
    const data = remainder + chunk;
    const lines = data.split(/\r?\n/);
    remainder = lines.pop() ?? '';
    for (const line of lines) {
        processLine(line);
    }
});

readStream.on('end', () => {
    if (remainder) {
        processLine(remainder);
    }
    parentPort.postMessage({
        total,
        levels,
        status,
        paths,
        responseTimeSum,
    });
});

readStream.on('error', (error) => {
    parentPort.postMessage({
        total: 0,
        levels: {},
        status: {},
        paths: {},
        responseTimeSum: 0,
        error: error.message,
    });
});
