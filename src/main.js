import readline from 'node:readline';
import { repl } from './repl.js';
import { printCurrentDir } from './navigation.js';

const main = () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> ',
    });

    let isGoodbyePrinted = false;
    const sayGoodbye = () => {
        if (!isGoodbyePrinted) {
            console.log('Thank you for using Data Processing CLI!');
            isGoodbyePrinted = true;
        }
    };

    rl.on('close', () => {
        sayGoodbye();
        process.exit();
    });

    console.log('Welcome to Data Processing CLI!');
    printCurrentDir();
    rl.prompt();

    rl.on('line', async (input) => {
        await repl(input.trim(), rl.close);

        printCurrentDir();
        rl.prompt();
    });

    rl.on('SIGINT', rl.close);
};

main();
