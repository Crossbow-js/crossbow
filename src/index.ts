#!/usr/bin/env node
/// <reference path="../typings/main.d.ts" />
import runner = require("./command.run");
import {CrossbowConfiguration, merge} from './config';
import run from './command.run';
import {Map} from 'immutable';
import {TaskRunner} from "./task.runner";
import {Task} from "./task.resolve";
import {retrieveExternalInputFiles} from "./task.utils";

const meow    = require('meow');
const assign  = require('object-assign');

export interface Meow {
    input: string[]
    flags: any
    help: string
}

function generateMeowInput (incoming: Meow|any) : Meow {
    return assign({input: [], flags:{}}, incoming || {});
}

export interface CrossbowInput {
    tasks: any
    watch: any
    config: any
    gruntfile?: string
}

function generateInput (incoming: CrossbowInput|any) : CrossbowInput {
    return assign({tasks:{}, watch: {}, config:{}}, incoming || {});
}

const availableCommands = ['watch', 'run'];


if (!module.parent) {
    const cli = <Meow>meow();
    // passing string here produces the correct compiler error
    console.log(cli);
}

function handleIncoming (cli: Meow, input: CrossbowInput | any): TaskRunner | void {
    cli = generateMeowInput(cli);
    const mergedConfig = merge(cli.flags);

    if (availableCommands.indexOf(cli.input[0]) === -1) {
        console.log(cli.help);
        return;
    }

    /**
     * If a user tried to load configuration from
     * an external file, load that now and set as the input
     */
    if (mergedConfig.config) {
        const externalInputs = retrieveExternalInputFiles(mergedConfig);
        if (externalInputs.length) {
            return processInput(cli, generateInput(externalInputs[0]), mergedConfig);
        }
    }

    if (input) {
        return processInput(cli, generateInput(input), mergedConfig);
    }
}

function processInput(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) : TaskRunner {

    if (cli.input[0] === 'run') {
        if (cli.input.length === 1) {
            console.log('You didn\'t provide a command for Crossbow to run');
            return;
        }
        return run(cli, input, config);
    }
}

export default handleIncoming;
module.exports = handleIncoming;
