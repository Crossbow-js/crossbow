/// <reference path="../typings/main.d.ts" />
import {RunCommandTrigger} from "./command.run";
const debug  = require('debug')('cb:command.run');
const Rx     = require('rx');
const merge  = require('lodash.merge');

import {CrossbowConfiguration} from "./config";
import {reportTree, reportTaskErrors} from './reporters/defaultReporter';
import {CrossbowInput, Meow} from "./index";
import {resolveTasks} from "./task.resolve";
import {logErrors} from "./reporters/defaultReporter";

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): void {

    const ctx: RunCommandTrigger = {cli, input, config, type: 'command'};

    /**
     * First Resolve the task names given in input.
     */
    const tasks = resolveTasks(Object.keys(input.tasks), ctx);

    reportTree(tasks.all);
}

