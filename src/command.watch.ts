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



    /**
     * First Resolve the task names given in input.
     */
    const tasks = resolveWatchTasks(cliInput, ctx);

}

export function unwrapShorthand(incoming) {



    return {
        patterns: [],
        tasks: []
    }
}

export function handleIncomingWatchCommand (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    execute(cli, input, config);
}
