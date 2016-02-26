/// <reference path="../typings/main.d.ts" />
import {RunCommandTrigger} from './command.run';
import {CrossbowConfiguration} from './config';
import {reportTree, reportTaskErrors} from './reporters/defaultReporter';
import {CrossbowInput, Meow} from './index';
import {resolveTasks} from './task.resolve';

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): void {

    const ctx: RunCommandTrigger = {cli, input, config, type: 'command'};
    /**
     * First Resolve the task names given in input.
     */
    reportTree(resolveTasks(Object.keys(input.tasks), ctx).all, config, 'Crossbow Config');
    /**
     * Next report the available Npm scripts
     */
    reportTree(resolveTasks(Object.keys(input.npmScripts), ctx).all, config, 'Npm Scripts');
}

export function handleIncomingTreeCommand (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    execute(cli, input, config);
}
