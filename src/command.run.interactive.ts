/// <reference path="../typings/main.d.ts" />
const debug = require('debug')('cb:command.run');
const Rx    = require('rx');

import {TaskRunner} from './task.runner';
import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';
import {resolveTasks} from './task.resolve';
import {createRunner, createFlattenedSequence} from './task.sequence';
import {summary, reportTaskList, reportTaskErrors, reportTaskErrorLinks} from './reporters/defaultReporter';

export default function prompt (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration, cb) {

    //var inquirer = require("inquirer");

    //const taskSelect = {
    //    type: "checkbox",
    //    message: "Select Tasks to run (space bar to select, enter to finish)",
    //    name: "tasks",
    //    choices: [
    //        new inquirer.Separator("From Npm scripts"),
    //        {
    //            name: "lint"
    //        },
    //        {
    //            name: "test"
    //        },
    //        {
    //            name: "mocha test"
    //        },
    //        new inquirer.Separator("From crossbow.yaml config"),
    //        {
    //            name: "Mozzarella"
    //        },
    //        {
    //            name: "Cheddar"
    //        },
    //        {
    //            name: "Parmesan"
    //        }
    //    ],
    //    validate: function( answer ) {
    //        if ( answer.length < 1 ) {
    //            return "You must choose at least one topping.";
    //        }
    //        return true;
    //    }
    //};
    //
    //"use strict";
    //
    //var inquirer = require("inquirer");
    //
    //inquirer.prompt(taskSelect, function( answers ) {
    //
    //    console.log(answers);
    //
    //    inquirer.prompt({
    //        type: "list",
    //        name: "runMode",
    //        message: "Would you like to run tasks these in order (series), or let them race (parallel)?",
    //        choices: [
    //            {
    //                key: "y",
    //                name: "Series (in order)",
    //                value: "series"
    //            },
    //            {
    //                key: "x",
    //                name: "Parallel (race)",
    //                value: "parallel"
    //            }
    //        ]
    //    }, function (answers) {
    //
    //        console.log(answers);
    //
    //    });
    //});
}

