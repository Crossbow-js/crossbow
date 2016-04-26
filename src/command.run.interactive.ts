/// <reference path="../typings/main.d.ts" />
const debug    = require('debug')('cb:command.run');
const Rx       = require('rx');
const merge    = require('lodash.merge');
const inquirer = require('inquirer');

import {TaskRunner} from './task.runner';
import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';
import {compile} from './logger';

export default function prompt (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {

    const taskSelect = {
        type: "checkbox",
        message: "Select Tasks to run with <space>",
        name: "tasks",
        choices: buildPrompt(input.tasks),
        validate: function( answer: string[] ): any {
            if ( answer.length < 1 ) {
                return "You must choose at least one task";
            }
            return true;
        }
    };

    const runModeSelect = {
        type: "list",
        name: "runMode",
        message: "Would you like to run tasks these in order (series), or let them race (parallel)?",
        choices: [
            {
                key: "y",
                name: "Series (in order)",
                value: "series"
            },
            {
                key: "x",
                name: "Parallel (race)",
                value: "parallel"
            }
        ]
    };

    const pr = Rx.Observable.fromCallback(inquirer.prompt, inquirer);

    return pr(taskSelect)
        .pluck('tasks')
        .flatMap(tasks => {
            if (tasks.length === 1) {
                return Rx.Observable.just({tasks});
            }
            return pr(runModeSelect).pluck('runMode').map(runMode => {
                return {
                    runMode: runMode,
                    tasks: tasks
                }
            });
        });
}

export function buildPrompt (input) {
    return Object.keys(input).map(key => ({name:key, value: key}));
}
