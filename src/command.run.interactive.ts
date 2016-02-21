/// <reference path="../typings/main.d.ts" />
const debug = require('debug')('cb:command.run');
const Rx    = require('rx');

import {TaskRunner} from './task.runner';
import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';
import {resolveTasks} from './task.resolve';
import {compile} from './logger';
import {createRunner, createFlattenedSequence} from './task.sequence';
import {summary, reportTaskList, reportTaskErrors, reportTaskErrorLinks} from './reporters/defaultReporter';

export default function prompt (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration, cb) {

    var inquirer = require("inquirer");

    const taskSelect = {
        type: "checkbox",
        message: "Select Tasks to run with <space>",
        name: "tasks",
        choices: buildPrompt(input, config),
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

    pr(taskSelect)
        .subscribe(x => {
            console.log(x);
        })

    //inquirer.prompt(taskSelect, function( taskAnswer ) {
    //    cli.input = ['run', ...taskAnswer.tasks];
    //    if (taskAnswer.tasks.length === 1) {
    //        return cb(null, cli, input, config);
    //    }
    //    inquirer.prompt(runModeSelect, function (runmodeAnswer) {
    //        config.runMode = runmodeAnswer.runMode;
    //        return cb(null, cli, input, config);
    //    });
    //});
}


export function buildPrompt (input, config) {

    return Object.keys(input.tasks).map(x => ({
        name: compile(`${x} {gray:(${input.tasks[x]})}`)
    }));
}
