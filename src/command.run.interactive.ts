import {isInternal, getLongestTaskName, getPossibleTaskNames} from "./task.utils";
const debug = require('debug')('cb:command.run');
import Rx = require('rx');
import Immutable = require('immutable');
import {compile} from './logger';
import {CLI, CrossbowInput, CrossbowReporter} from './index';
import {CrossbowConfiguration} from './config';
import {resolveTasks, TaskTypes} from "./task.resolve";
import {TriggerTypes} from "./command.run";
import {Task} from "./task.resolve";
import {twoCol} from "./reporters/task.list";
import {ReportTypes} from "./reporter.resolve";
import {getLabel, getCleanLabel} from "./reporters/defaultReporter";

export interface Answers {
    tasks: string[]
}

export default function prompt(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter): Rx.Observable<Answers> {

    const possibleSelection  = cli.input.slice(1);
    const inquirer           = require('inquirer');
    const allTaskNames       = getPossibleTaskNames(input);

    const filtered           = possibleSelection.reduce((acc, name) => {
        return acc.concat(allTaskNames
            .filter(x => x.indexOf(`${name}:`) === 0)
        );
    }, []);

    const taskNamesToShow = (function () {
        if (filtered.length) return filtered;
        return allTaskNames;
    })();

    const resolved = resolveTasks(taskNamesToShow, {
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });

    if (resolved.invalid.length) {

        reporter({type: ReportTypes.TaskTree, data: {tasks: resolved.all, config, title: 'Available tasks:'}});
        return Rx.Observable.empty<Answers>();

    } else {
        const taskSelect = {
            type: "checkbox",
            message: "Select Tasks to run with <space>",
            name: "tasks",
            choices: getTaskList(resolved.valid),
            validate: function (answer: string[]): any {
                if (answer.length < 1) {
                    return "You must choose at least one task";
                }
                return true;
            }
        };
        return Rx.Observable.fromPromise<Answers>(inquirer.prompt(taskSelect));
    }
}

export function getTaskList(tasks: Task[]) {
    const topLevelTasks = tasks.filter(x => !isInternal(x.baseTaskName));
    const longest       = getLongestTaskName(topLevelTasks);
    const col           = twoCol(topLevelTasks, longest);
    return col.map((tuple, i) => {
        return {
            name: compile(`${tuple[0]} ${tuple[1]}`),
            value: (function () {
                return getCleanLabel(topLevelTasks[i]);
            })()
        }
    });
}
