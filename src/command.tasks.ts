
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {LogLevel} from './reporters/defaultReporter';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import {resolveTasks, Tasks} from './task.resolve';
import {getSimpleTaskList} from "./reporters/task.list";

import Immutable = require('immutable');
import Rx = require('rx');
import {ReportTypes, TaskTreeReport, SimpleTaskListReport} from "./reporter.resolve";
import {getPossibleTasksFromDirectories} from "./file.utils";
import {isParentGroupName} from "./task.utils";

export interface TasksCommandCompletionReport {
    tasks: Tasks,
    errors: Error[]
}

export type TasksCommandComplete = Rx.Observable<TasksCommandCompletionReport>;

function execute(trigger: CommandTrigger): TasksCommandComplete {

    const {input, config, reporter} = trigger;

    /**
     * Either resolve ALL tasks, or a subset if given
     * via the cli.
     *
     * eg:
     *      crossbow ls -> all tasks
     *      crossbow ls build-all -> only build all tasks
     */
    const toResolve = (function () {

        /**
         * First look if there's trailing task names in cli input
         * @type {string[]}
         */
        const cliTasks = trigger.cli.input.slice(1);
        if (cliTasks.length) {
            return cliTasks;
        }

        /**
         * Now build up available tasks using input + tasks directories
         */
        const taskNamesToResolve = Object.keys(input.tasks).filter(key => !isParentGroupName(key));
            // .reduce(function (acc, key) {
            //     const matchParent = isParentGroupName(key);
            //     if (matchParent) {
            //         const childKeys = Object.keys(input.tasks[key]);
            //         const plainName = matchParent[1];
            //         return acc.concat(childKeys.map(x => `${plainName}:${x}`));
            //     }
            //     return acc.concat(key);
            // }, []);
        const taskNamesFromTasksDir = getPossibleTasksFromDirectories(config.tasksDir, config.cwd);
        return [...taskNamesToResolve, ...taskNamesFromTasksDir];
    })();

    /**
     * Resolve the subset
     * @type {Tasks}
     */
    console.log(toResolve);
    const resolved = resolveTasks(toResolve, trigger);
    const resolvedParents = Object.keys(input.tasks)
        .filter(key => isParentGroupName(key))
        .reduce(function (acc, key) {
            const matchParent = isParentGroupName(key);
            const childKeys = Object.keys(input.tasks[key]);
            const plainName = matchParent[1];
            if (!acc[plainName]) {
                acc[plainName] = childKeys;
            } else {
                acc[plainName].push.apply(acc[plainName], childKeys);
            }
            return acc;
        }, {});

    doReport('Available tasks', resolved);

    Object.keys(resolvedParents).forEach(function (key) {
        const parent = resolvedParents[key];
        const items  = parent.map(x => `${key}:${x}`);
        const resolved = resolveTasks(items, trigger);
        doReport(key, resolved);
    });

    return Rx.Observable.just({tasks: resolved, errors: []});

    function doReport (title, resolved) {

        /**
         * handoff if requested
         */
        if (trigger.config.handoff) {
            return Rx.Observable.just({tasks: resolved, errors: []});
        }

        /**
         * If no tasks were matched, give the usual error
         */
        if (resolved.all.length === 0) {
            reporter({type: ReportTypes.NoTasksAvailable});
            return Rx.Observable.just({tasks: resolved, errors: []});
        }

        /**
         * If any were invalid or if the user gave the verbose
         * flag, show the full tree
         */
        if (resolved.invalid.length || config.verbose === LogLevel.Verbose) {
            reporter({
                type: ReportTypes.TaskTree,
                data: {
                    tasks: resolved.all,
                    config,
                    title
                }
            } as TaskTreeReport);
        } else {
            /**
             * Otherwise just print a simple two-col list
             */
            reporter({
                type: ReportTypes.SimpleTaskList,
                data: {
                    lines: getSimpleTaskList(resolved.all),
                    title
                }
            } as SimpleTaskListReport);
        }
    }
}

export default function handleIncomingTasksCommand(
    cli: CLI,
    input: CrossbowInput,
    config: CrossbowConfiguration,
    reporter: CrossbowReporter): TasksCommandComplete {
    return execute({
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });
}
