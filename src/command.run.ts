/// <reference path="../typings/main.d.ts" />
import {TaskRunner} from "./task.runner";
const debug = require('debug')('cb:command.run');

const Rx    = require('rx');

import {Meow, CrossbowInput} from "./index";
import {CrossbowConfiguration} from "./config";
import {resolveTasks} from "./task.resolve";
import {createSequence} from "./task.sequence";
import {createRunner} from "./runner";

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
    const sequence = createSequence(tasks.valid, ctx);
    //const runner = createRunner(tasks.valid, sequence, ctx);

    if (config.handoff) {
        debug(`Handing off runner`);
        return {tasks, sequence};
    }
}

