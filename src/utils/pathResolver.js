import path from 'node:path';
import { getCurrentWorkingDir } from '../navigation.js';
import { getArgValueByName } from '../utils/argParser.js';
import { access } from 'node:fs/promises';

export const pathResolver = async (command, pathArgNames = [], onlyFirstPathAccessCheck = true, withPathArgValues) => {
    const resolvedPaths = [];
    const pathArgValues = [];

    for (const pathArgName of pathArgNames) {
        const pathArgValue = getArgValueByName(command, pathArgName);
        if (withPathArgValues) pathArgValues.push(pathArgValue);
        if (!pathArgValue) {
            console.log('Invalid input');
            return;
        }
        const filePath = path.resolve(getCurrentWorkingDir(), pathArgValue);
        if (pathArgName === pathArgNames[0] || !onlyFirstPathAccessCheck) {
            const fileExists = await access(filePath).then(() => true).catch(() => false);
            if (!fileExists) {
                console.log('Operation failed');
                return;
            }
        }
        resolvedPaths.push(filePath);
    }
    if (withPathArgValues) return { resolvedPaths, pathArgValues };
    return resolvedPaths;
}