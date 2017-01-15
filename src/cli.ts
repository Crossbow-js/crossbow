import {commands, CLICommands, twoColFromJson} from "./cli.commands";
const _ = require("../lodash.custom");
import parse, {FlagsOutput} from "./cli.parse";

export interface PostCLIParse {
    cli: FlagsOutput;
    execute: boolean;
    output: string[];
}

export default function (args: string[]): PostCLIParse  {

    const command = args[0];
    const match   = getCommand(command, commands);

    if (!match.length) {

        // first look if the user provided a --version flag
        const cli = parse(["no-command", ...args], require("../opts/global-common.json"));

        if (cli.flags.version) {
            return {cli, execute: false, output: [require("../package.json").version]};
        }

        const commandOptions = commands["run"].opts.map(require);
        const opts           = _.merge({}, ...commandOptions);
        const cli2            = parse(["run", ...args], opts);

        /**
         * If there was additional input, try to run a task
         */
        if (cli2.input.length > 1) {
            return {cli: cli2, execute: true, output: []};
        }

        return {cli: cli2, execute: false, output: [printHelp(commands)]};
    }

    const commandName    = match[0];
    const commandOptions = commands[commandName].opts.map(require);
    const opts           = _.merge({}, ...commandOptions);
    const cli            = parse(args, opts);

    /**
     * Here, the user gave the --help flag along with a valid
     * command. So we show command-specific help
     */
    if (cli.flags.help) {
        return {cli, execute: false, output: [commands[match[0]].help]};
    }

    return {cli, execute: true, output: []};
}

function printHelp (commands) {
    return `Usage: crossbow [command] [..args] [OPTIONS]

{bold:Crossbow Commands:} 

${twoColFromJson(commands, "description")}

{bold:Example: Run the task 'build-js'}

    $ crossbow run build-js
    
{bold:Example: Run the tasks build-css and build-js in sequence}

    $ crossbow run build-css build-js
        
{bold:For more detailed help, use the command name + the --help flag}

    $ crossbow run --help
    $ crossbow init --help
`;
}

export function getCommand(incoming: string, commands: CLICommands): string[] {

    return Object.keys(commands).reduce(function (acc, item) {

        const selected = commands[item];

        /**
         * A direct match - this means the typed command matches
         * an command name exactly.
         *
         * eg:
         *  $ crossbow run
         *
         * -> ['run']
         */
        if (item === incoming) {
            return acc.concat(item);
        }

        /**
         * An alias match is when a short-hand command was given
         * and it existed in the 'alias' array for a command.
         *
         * eg:
         *
         *  $ crossbow run
         *
         * commands:
         *
         * run: { alias:['run', 'r'] }
         *
         * -> ['run']
         *
         */
        if (selected.alias && selected.alias.indexOf(incoming) > -1) {
            return acc.concat(item);
        }

        return acc;
    }, []);
}
