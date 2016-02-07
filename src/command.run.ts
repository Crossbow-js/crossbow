/// <reference path="../typings/main.d.ts" />
const debug = require('debug')('cb:command.run');

const Rx    = require('rx');

import {Meow, CrossbowInput} from "./index";
import {CrossbowConfiguration} from "./config";
import {createTaskRunner, TaskRunner} from "./tasks.resolve";

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

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    const cliInput = cli.input.slice(1);
    const ctx: RunCommandTrigger = {cli, input, config, type: 'command'};
    const runner = createTaskRunner(cliInput, ctx);

    if (config.handoff) {
        debug(`Handing off runner`);
        return runner;
    }
}

