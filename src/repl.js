import { count } from "./commands/count.js";
import { csvToJson } from "./commands/csvToJson.js";
import { decrypt } from "./commands/decrypt.js";
import { encrypt } from "./commands/encrypt.js";
import { hash } from "./commands/hash.js";
import { hashCompare } from "./commands/hashCompare.js";
import { jsonToCsv } from "./commands/jsonToCsv.js";
import { changeDir, listAllFilesAndDirs, moveUpDir } from "./navigation.js";

export const repl = async (command, closeCallback) => {
    if (command.startsWith('cd')) {
        const target = command.slice(3).trim();
        await changeDir(target);
        return;
    }
    if (command.startsWith('csv-to-json')) {
        await csvToJson(command);
        return;
    }
    if (command.startsWith('json-to-csv')) {
        await jsonToCsv(command);
        return;
    }
    if (command.startsWith('count')) {
        await count(command);
        return;
    }
    if (command.startsWith('hash ')) {
        await hash(command);
        return;
    }
    if (command.startsWith('hash-compare')) {
        await hashCompare(command);
        return;
    }
    if (command.startsWith('encrypt')) {
        await encrypt(command);
        return;
    }
    if (command.startsWith('decrypt')) {
        await decrypt(command);
        return;
    }

    switch (command) {
        case 'up':
            // Move up one directory level:
            await moveUpDir();
            break;
        case 'ls':
            // List files and directories in current directory:
            await listAllFilesAndDirs();
            break;
        case 'log-stats':
            // Analyze a large log file using Worker Threads
            break;
        case 'exit':
            closeCallback();
            return;
        default:
            if (command.length > 0) {
                console.log('Invalid input');
            }
            break;
    }
}
