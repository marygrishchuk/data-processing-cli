import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const BASE_DIR = path.resolve(import.meta.dirname, '../');
let currentWorkingDir = BASE_DIR;

export const getCurrentWorkingDir = () => currentWorkingDir;

const isDirectory = async (candidatePath) => {
    try {
        const fileOrDirStat = await stat(candidatePath);
        return fileOrDirStat.isDirectory();
    } catch {
        return false;
    }
};

export const moveUpDir = async () => {
    if (currentWorkingDir === BASE_DIR) return;
    const nextDir = path.resolve(currentWorkingDir, '../');
    if (!await isDirectory(nextDir)) {
        console.log('Operation failed');
        return;
    }
    currentWorkingDir = nextDir;
};

export const changeDir = async (targetPath) => {
    const nextDir = path.resolve(currentWorkingDir, targetPath);
    if (!targetPath.length || !await isDirectory(nextDir)) {
        console.log('Operation failed');
        return;
    }
    currentWorkingDir = nextDir;
};

export const printCurrentDir = () => {
    console.log(`You are currently in ${currentWorkingDir}`);
};

export const listAllFilesAndDirs = async () => {
    const filesAndDirs = await readdir(currentWorkingDir, { recursive: true, withFileTypes: true });

    const allFilesAndDirs = [];
    for (const fileOrDir of filesAndDirs) {
        if (fileOrDir.isFile()) {
            allFilesAndDirs.push({ fileName: fileOrDir.name, type: 'file' });
        } else if (fileOrDir.isDirectory()) {
            allFilesAndDirs.push({ fileName: fileOrDir.name, type: 'folder' });
        }
    }

    allFilesAndDirs.sort((a, b) => a.fileName.localeCompare(b.fileName)).sort((a, b) => b.type.localeCompare(a.type));
    allFilesAndDirs.forEach(({ fileName, type }) => console.log(`${fileName}\t[${type}]`));
}
