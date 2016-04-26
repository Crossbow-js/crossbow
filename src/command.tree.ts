/// <reference path="../typings/main.d.ts" />
import {CommandTrigger} from './command.run';
import {CrossbowConfiguration} from './config';
import {reportTaskTree} from './reporters/defaultReporter';
import {CrossbowInput, Meow} from './index';
import {resolveTasks} from './task.resolve';

export default function execute(trigger: CommandTrigger): void {
    const {input, config} = trigger;
    /**
     * First Resolve the task names given in input.
     */
    reportTaskTree(resolveTasks(Object.keys(input.tasks), trigger).all, config, 'Crossbow Config');
}

export function handleIncomingTreeCommand(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    execute({cli, input, config, type: 'command'});
}
