import {resolveTasks, TaskRunModes} from "./task.resolve";
import * as seq from "./task.sequence";
import {CommandTrigger, RunCommandSetup} from "./command.run-cli";
import Rx = require('rx');

export function getRunCommandSetup (trigger: CommandTrigger): RunCommandSetup {
    const cliInput = trigger.cli.input.slice(1);

    /**
     * Task Tracker for external observers
     * @type {Subject<T>}
     */
    trigger.tracker = new Rx.Subject();
    trigger.tracker$ = trigger.tracker.share();

    /**
     * First Resolve the task names given in input.
     */
    const tasks = resolveTasks(cliInput, trigger);
    const topLevelParallel = tasks.all.some(function (task) {
        return task.runMode === TaskRunModes.parallel;
    });

    /**
     * If only 1 task is being run, check if any sub-tasks
     * are trying to be run in parallel mode and if so, set the runMode
     * This is done to ensure if a child errors, it doesn't affect children.
     * (as it's only a single task via the cli, it wouldn't be expected)
     */
    if (cliInput.length === 1 && topLevelParallel) {
        trigger.config.runMode = TaskRunModes.parallel;
    }

    /**
     * All this point, all given task names have been resolved
     * to either modules on disk, or @adaptor tasks, so we can
     * go ahead and create a flattened run-sequence
     */
    const sequence = seq.createFlattenedSequence(tasks.valid, trigger);

    /**
     * With the flattened sequence, we can create nested collections
     * of Rx Observables
     */
    const runner = seq.createRunner(sequence, trigger);

    /**
     * Check if the user intends to handle running the tasks themselves,
     * if thats the case we give them the resolved tasks along with
     * the sequence and the primed runner
     */
    return {tasks, sequence, runner, cli: trigger.cli};
}