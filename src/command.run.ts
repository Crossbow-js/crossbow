/// <reference path="../typings/main.d.ts" />
const debug = require('debug')('command:run');
const Rx    = require('rx');

import {Meow, CrossbowInput} from "./index";
import {CrossbowConfiguration} from "./config";

export interface RunCommandTrigger {
    type: 'command'
    cli: Meow
    input: CrossbowInput
    config: CrossbowConfiguration
}

if (process.env.DEBUG) {
    Rx.config.longStackSupport = true;
}

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    const cliInput = cli.input.slice(1);
    const ctx = <RunCommandTrigger>{cli, input, config, type: 'command'};
}

