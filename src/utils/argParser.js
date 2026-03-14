export const getArgValueByName = (command, argName) => {
    const splitCommand = command.split(' ');
    const ardIndex = splitCommand.findIndex(arg => arg === `--${argName}`);
    if (ardIndex >= 0 && splitCommand[ardIndex + 1]) {
        return splitCommand[ardIndex + 1];
    }
}