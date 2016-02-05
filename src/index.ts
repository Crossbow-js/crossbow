#!/usr/bin/env node
/// <reference path="../typings/main.d.ts" />
import runner = require("./command.run");
import config = require("./config");
const meow    = require('meow');
const assign  = require('object-assign');

interface Meow {
    input: string[]
    flags: any
    help: string
}

function generateMeowInput (incoming: Meow|any) : Meow {
    return assign({input: [], flags:{}}, incoming || {});
}

interface CrossbowInput {
    tasks?: any
    watch?: any
    config?: any
    gruntfile?: string
}

const availableCommands = ['watch', 'run'];

if (!module.parent) {
    const cli = <Meow>meow();
    // passing string here produces the correct compiler error
    console.log(cli);
}

function handleIncoming (cli: Meow, input: CrossbowInput | void) {
    cli = generateMeowInput(cli);
    const mergedConfig = config.merge(cli.flags);

    if (availableCommands.indexOf(cli.input[0]) === -1) {
        return console.log(cli.help);
    }

    if (input) {

    }
}

function processInput(cli: Meow, input: CrossbowInput) {

}

export default handleIncoming;
module.exports = handleIncoming;
