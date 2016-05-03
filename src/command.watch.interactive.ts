/// <reference path="../typings/main.d.ts" />
import {stripBlacklisted} from "./watch.utils";
const debug = require('debug')('cb:command.run');
const inquirer = require('inquirer');

import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';

export default function promptForWatchCommand(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {

    const topLevelWatchers = stripBlacklisted(Object.keys(input.watch));
    const prompt = topLevelWatchers.map(key => ({name: key, value: key}));

    const taskSelect = {
        type: "checkbox",
        message: "Select Watchers to run with <space>",
        name: "watch",
        choices: prompt,
        validate: function (answer: string[]): any {
            if (answer.length < 1) {
                return "You must choose at least one watcher";
            }
            return true;
        }
    };

    return inquirer.prompt(taskSelect);
}
