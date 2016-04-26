/// <reference path="../typings/main.d.ts" />
const debug    = require('debug')('cb:command.run');
const inquirer = require('inquirer');

import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';

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

    return inquirer.prompt(taskSelect);
}

export function buildPrompt (input) {
    return Object.keys(input).map(key => ({name:key, value: key}));
}
