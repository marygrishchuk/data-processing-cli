import { open, stat, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { Worker } from 'worker_threads';
import { pathResolver } from '../utils/pathResolver.js';

const TOP_PATHS_LIMIT = 2; // we show only 2 top paths according to the example provided in the assignment
const LINE_BREAK_BYTE_VALUE = 10; // we search for 10B (\n) to align chunk boundaries to line breaks so each worker gets whole lines
const SEARCH_BUFFER_SIZE = 64 * 1024; // we scan forward in 64KB chunks to find the next newline when computing boundaries

const findNextNewline = async (fileHandle, offset, fileSize) => {
    if (offset <= 0) return 0;
    if (offset >= fileSize) return fileSize;

    const buffer = Buffer.alloc(SEARCH_BUFFER_SIZE);
    for (let position = offset; position < fileSize;) {
        const length = Math.min(SEARCH_BUFFER_SIZE, fileSize - position);
        const { bytesRead } = await fileHandle.read(buffer, 0, length, position);
        if (bytesRead === 0) return fileSize;
        const index = buffer.subarray(0, bytesRead).indexOf(LINE_BREAK_BYTE_VALUE);
        if (index >= 0) {
            return position + index + 1;
        }
        position += bytesRead;
    }
    return fileSize;
};

const computeChunkBoundaries = async (fileHandle, fileSize, workerCount) => {
    const boundaries = [0];
    const chunkSize = Math.floor(fileSize / workerCount);
    for (let i = 1; i < workerCount; i++) {
        const approx = chunkSize * i;
        const boundary = await findNextNewline(fileHandle, approx, fileSize);
        boundaries.push(boundary);
    }
    boundaries.push(fileSize);
    return boundaries; // an array of byte offsets for each chunk
};

const runWorker = (inputPath, start, end) => new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/logWorker.js', import.meta.url), {
        workerData: { inputPath, start, end },
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', code => {
        if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
        }
    });
});

const mergeCounts = (target, source) => {
    for (const [key, value] of Object.entries(source)) {
        target[key] = (target[key] ?? 0) + value;
    }
};

const mergePartials = (partials) => {
    const merged = {
        total: 0,
        levels: {},
        status: {},
        paths: {},
        responseTimeSum: 0,
    };

    for (const partial of partials) {
        merged.total += partial.total;
        merged.responseTimeSum += partial.responseTimeSum;
        mergeCounts(merged.levels, partial.levels);
        mergeCounts(merged.status, partial.status);
        mergeCounts(merged.paths, partial.paths);
    }
    return merged;
};

export const logStats = async (command) => {
    let inputPath, outputPath;
    try {
        const paths = await pathResolver(command, ['input', 'output']);
        inputPath = paths[0];
        outputPath = paths[1];
    } catch (error) {
        return;
    }

    try {
        const fileStat = await stat(inputPath);
        if (fileStat.size === 0) {
            const emptyResult = {
                total: 0,
                levels: {},
                status: {},
                topPaths: [],
                avgResponseTimeMs: 0,
            };
            await writeFile(outputPath, JSON.stringify(emptyResult, null, 2), 'utf8');
            return;
        }

        const workerCount = Math.max(1, cpus().length);
        const fileHandle = await open(inputPath, 'r');
        let boundaries;
        try {
            boundaries = await computeChunkBoundaries(fileHandle, fileStat.size, workerCount);
        } finally {
            await fileHandle.close();
        }

        const tasks = [];
        for (let i = 0; i < boundaries.length - 1; i++) {
            const start = boundaries[i];
            const end = boundaries[i + 1] - 1;
            if (start > end) continue;
            tasks.push(runWorker(inputPath, start, end));
        }

        const partials = await Promise.all(tasks);
        const workerError = partials.find((partial) => partial.error);
        if (workerError) {
            throw new Error(workerError.error);
        }
        const merged = mergePartials(partials);
        const topPaths = Object.entries(merged.paths)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, TOP_PATHS_LIMIT)
            .map(([path, count]) => ({ path, count }));

        const avgResponseTimeMs = merged.total > 0
            ? Number((merged.responseTimeSum / merged.total).toFixed(2))
            : 0;

        const result = {
            total: merged.total,
            levels: merged.levels,
            status: merged.status,
            topPaths,
            avgResponseTimeMs,
        };

        await writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
    } catch (error) {
        console.log('Operation failed');
    }
};
