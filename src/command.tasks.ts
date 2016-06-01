/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {reportTaskTree} from './reporters/defaultReporter';
import {CrossbowInput, CLI} from './index';
import {resolveTasks} from './task.resolve';
import Immutable = require('immutable');
import Rx = require('rx');
import {printSimpleTaskList} from "./reporters/task.list";

export default function execute(trigger: CommandTrigger): void {
    const {input, config} = trigger;
    printSimpleTaskList(resolveTasks(Object.keys(input.tasks), trigger).all, config, 'Available tasks:', true);
}

export function handleIncomingTasksCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration) {
    execute({
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        type: TriggerTypes.command
    });
}
