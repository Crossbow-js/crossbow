/// <reference path="../typings/main.d.ts" />
import {isInternal} from "./task.utils";
const debug = require('debug')('cb:command.run');
const inquirer = require('inquirer');

import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';

export default function prompt(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {

    const topLevelTasks = Object.keys(input.tasks).filter(x => !isInternal(x));
    const prompt        = topLevelTasks.map(key => ({name: key, value: key}));

    const taskSelect = {
        type: "checkbox",
        message: "Select Tasks to run with <space>",
        name: "tasks",
        choices: prompt,
        validate: function (answer: string[]): any {
            if (answer.length < 1) {
                return "You must choose at least one task";
            }
            return true;
        }
    };

    return inquirer.prompt(taskSelect);
}
