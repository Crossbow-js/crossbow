/// <reference path="../typings/main.d.ts" />
import {CommandTrigger} from './command.run';
import {CrossbowConfiguration} from './config';
import {reportTree, reportTaskErrors} from './reporters/defaultReporter';
import {CrossbowInput, Meow} from './index';
import {resolveWatchTasks} from './watch.resolve';

export interface WatchTrigger extends CommandTrigger {
    type: 'watcher'
}

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): void {
    const cliInput = cli.input.slice(1);
    const ctx: WatchTrigger = {cli, input, config, type: 'watcher'};

    cliInput.forEach(function (input) {
    	unwrapShorthand(input);
    })

    /**
     * First Resolve the task names given in input.
     */
    const tasks = resolveWatchTasks(cliInput, ctx);

}

export function unwrapShorthand(incoming) {
    var patterns = [];
    var tasks = [];

    if (incoming.indexOf(' -> ')) {
        const split = incoming.split(' -> ').map(x => x.trim());
        patterns = split[0].split(':');
        tasks = [split[1]];
    }

    return {
        patterns,
        tasks
    }
}

export function handleIncomingWatchCommand (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    execute(cli, input, config);
}
