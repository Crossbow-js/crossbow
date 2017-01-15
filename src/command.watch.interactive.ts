
import {stripBlacklisted} from "./watch.utils";
import Rx = require("rx");
const debug = require("debug")("cb:command.run");

import {CLI, CrossbowInput} from "./index";
import {CrossbowConfiguration} from "./config";

export interface WatchAnswers {
    watch: string[];
}

export default function promptForWatchCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration): Rx.Observable<WatchAnswers> {

    const inquirer = require("inquirer");
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

    return Rx.Observable.fromPromise<WatchAnswers>(inquirer.prompt(taskSelect));
}
