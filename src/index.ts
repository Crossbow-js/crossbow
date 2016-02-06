#!/usr/bin/env node
/// <reference path="../typings/main.d.ts" />
import runner = require("./command.run");
import {CrossbowConfiguration, merge} from './config';
import run from './command.run';
import {Map} from 'immutable';
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

function handleIncoming (cli: Meow, input: CrossbowInput | any) {
    cli = generateMeowInput(cli);
    const mergedConfig = merge(cli.flags);

    if (availableCommands.indexOf(cli.input[0]) === -1) {
        return console.log(cli.help);
    }

    if (input) {
        processInput(cli, generateInput(input), mergedConfig);
    }
}

function processInput(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {

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
