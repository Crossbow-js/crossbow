/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {reportTaskTree} from './reporters/defaultReporter';
import {CrossbowInput, Meow} from './index';
import {resolveTasks} from './task.resolve';
import Immutable = require('immutable');
import Rx = require('rx');
import {stripBlacklisted} from "./watch.utils";
import {resolveWatchTasks} from "./watch.resolve";

export default function execute(trigger: CommandTrigger): void {
    const {input, config}   = trigger;
    const topLevelWatchers  = stripBlacklisted(Object.keys(input.watch));
    const watchTasks        = resolveWatchTasks(topLevelWatchers, trigger);
    
    console.log(watchTasks);
    // debug(`${watchTasks.valid.length} valid task(s)`);/*
    // debug(`${watchTasks.invalid.length} invalid task(s)`);*/
    // reportTaskTree(resolveTasks(Object.keys(input.tasks), trigger).all, config, 'Available tasks:', true);
}

export function handleIncomingWatchersCommand(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    execute({
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        type: TriggerTypes.command
    });
}
