/// <reference path="../typings/main.d.ts" />
import {RunCommandTrigger} from './command.run';
import {CrossbowConfiguration} from './config';
import {reportTaskTree, reportTaskErrors} from './reporters/defaultReporter';
import {CrossbowInput, Meow} from './index';
import {resolveTasks} from './task.resolve';

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): void {

    const ctx: RunCommandTrigger = {cli, input, config, type: 'command'};
    /**
     * First Resolve the task names given in input.
     */
    reportTaskTree(resolveTasks(Object.keys(input.tasks), ctx).all, config, 'Crossbow Config');
}

export function handleIncomingTreeCommand (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    execute(cli, input, config);
}
