/// <reference path="../typings/main.d.ts" />
import {isInternal, getFunctionName, isPlainObject, stringifyObj} from "./task.utils";
const debug = require('debug')('cb:command.run');
const inquirer = require('inquirer');
import {compile} from './logger';
import {removeNewlines} from './task.utils';

import {CLI, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';

export default function prompt(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration) {

    const taskSelect = {
        type: "checkbox",
        message: "Select Tasks to run with <space>",
        name: "tasks",
        choices: getTaskList(input.tasks),
        validate: function (answer: string[]): any {
            if (answer.length < 1) {
                return "You must choose at least one task";
            }
            return true;
        }
    };

    return inquirer.prompt(taskSelect);
}

export function getTaskList(tasks) {
    const topLevelTasks = Object.keys(tasks).filter(x => !isInternal(x));
    const longest = topLevelTasks.reduce((val, item) => item.length > val ? item.length : val, 0);
    const minWindow = longest + 6;
    return topLevelTasks.map(function (key) {
        const items = [].concat(tasks[key]);
        if (items.length > 1) {
            return {
                name: `${padLine(key, longest)}  [${items.length} tasks]`,
                value: key
            }
        }
        return {
            name: (function (item) {
                if (typeof item === 'function') {
                    return `${padLine(key, longest)}  [Function]`;
                }
                if (isPlainObject(item) && item.description) {
                    return `${padLine(key, longest)}  ${item.description}`;
                }
                return `${padLine(key, longest)}  ${removeNewlines(stringifyObj(item, process.stdout.columns - (minWindow)))}`;
            })(items[0]),
            value: key
        }
    });
}

function padLine(incoming, max?) {
    if (incoming.length <= max) {
        return incoming + new Array(max-incoming.length+1).join(' ');
    }
    return incoming;
}
