/// <reference path="../typings/main.d.ts" />
import {TaskRunner} from "./task.runner";
const debug = require('debug')('cb:command.run');

const Rx    = require('rx');

import {Meow, CrossbowInput} from "./index";
import {CrossbowConfiguration} from "./config";
import {resolveTasks} from "./task.resolve";
import {createRunner, createFlattenedSequence} from "./task.sequence";

export interface CommandTrigger {
    type: string
    cli: Meow
    input: CrossbowInput
    config: CrossbowConfiguration
}

export interface RunCommandTrigger extends CommandTrigger {
    type: 'command'
}

if (process.env.DEBUG) {
    Rx.config.longStackSupport = true;
}

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): TaskRunner {
    const cliInput = cli.input.slice(1);
    const ctx: RunCommandTrigger = {cli, input, config, type: 'command'};
    const tasks = resolveTasks(cliInput, ctx);

    if (tasks.invalid.length) {
        console.log('Invalid tasks');
        return;
    }

    const sequence = createFlattenedSequence(tasks.valid, ctx);
    const runner = createRunner(sequence, ctx);

    if (config.handoff) {
        debug(`Handing off runner`);
        return {tasks, sequence, runner};
    }

    debug(`~ run mode from CLI '${config.runMode}'`);

    const runner$ = runner[config.runMode].call()
        .catch(function (e) {
            if (config.exitOnError === true) {
                return process.exit(1);
            }
            console.log(e.stack);
            return Rx.Observable.empty(e);
        }).share();

    runner$.subscribeOnCompleted(function () {
    	console.log(sequence);
    })
}

