
import {CommandTrigger, TriggerTypes} from "./command.run";
import {CrossbowConfiguration} from "./config";
import {CrossbowInput, CLI, CrossbowReporter} from "./index";
import {resolveTasks, Tasks, Task} from "./task.resolve";

import Immutable = require("immutable");
import Rx = require("rx");
import {getPossibleTasksFromDirectories} from "./file.utils";
import {
    isParentGroupName, isParentRef, getChildItems, getChildName
} from "./task.utils";

export interface TaskGroup {
    title: string;
    tasks: Tasks;
}

export interface TaskCommandSetup {
    groups: TaskGroup[];
    tasks: Task[];
    errors: Error[];
}

export interface TasksCommandCompletionReport {
    setup: TaskCommandSetup;
}

export type TasksCommandComplete = Rx.Observable<TasksCommandCompletionReport>;

function execute(trigger: CommandTrigger): TasksCommandComplete {

    const {input, config}   = trigger;

    const allNames          = Object.keys(trigger.input.tasks);
    const possibleParents   = allNames.filter(x => isParentGroupName(x));
    const possibleDefaults  = allNames.filter(x => !isParentGroupName(x));

    const cliInput          = trigger.cli.input.slice(1);
    const defaultInputNames = cliInput.filter(x => !isParentRef(x, possibleParents));
    const parentInputNames  = cliInput.filter(x => isParentRef(x, possibleParents));

    /**
     * Either resolve ALL tasks, or a subset if given
     * via the cli.
     *
     * eg:
     *      crossbow ls -> all tasks
     *      crossbow ls build-all -> only build all tasks
     */
    const defaultsToResolve = (function () {
        if (defaultInputNames.length) {
            return defaultInputNames;
        }
        if (parentInputNames.length) {
            return [];
        }
        const taskNamesFromTasksDir = getPossibleTasksFromDirectories(config.tasksDir, config.cwd);
        return [...possibleDefaults, ...taskNamesFromTasksDir];
    })();

    const parentsToResolve = (function () {
        if (parentInputNames.length) {
            return parentInputNames;
        }
        if (defaultInputNames.length) {
            return [];
        }
        return possibleParents;
    })();

    /**
     * Resolve the subset
     * @type {Tasks}
     */
    const resolvedDefault = resolveTasks(defaultsToResolve, trigger);
    const resolvedParents = parentsToResolve
        .map(getChildName)
        .reduce(function (acc, key) {
            const childKeys   = Object.keys(getChildItems(key, input.tasks));
            const plainName   = key.slice(1, -1);
            if (!acc[plainName]) {
                acc[plainName] = childKeys;
            } else {
                acc[plainName].push.apply(acc[plainName], childKeys);
            }
            return acc;
        }, {});

    function getParents (resolvedParents, trigger) {
        return Object.keys(resolvedParents).map(function (key): TaskGroup {
            const parent = resolvedParents[key];
            const items  = parent.map(x => `${key}:${x}`);
            const resolved = resolveTasks(items, trigger);
            return {title: key, tasks: resolved};
        });
    }

    const groups: Array<TaskGroup> = (function() {
        if (resolvedDefault.all.length) {
            return [
                {title: "Default Tasks", tasks: resolvedDefault},
                ...getParents(resolvedParents, trigger)
            ];
        }
        return getParents(resolvedParents, trigger);
    })();

    const tasks = groups.reduce((acc, group): Task[] => {
        return acc.concat(group.tasks.all);
    }, []);

    return Rx.Observable.just({
        setup: {
            groups,
            tasks,
            errors: []
        }
    });
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
