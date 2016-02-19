import {RunCommandTrigger} from "./command.run";
export interface IncomingTask {
    baseTaskName: string
    subTaskItems: string[]
    runMode: string
    rawInput: string
    taskName: string
}

export default function preprocessTask(taskName: string): IncomingTask {

    var split = taskName;
    var runMode = 'series';

    if (taskName.match(/@[p]$/)) {
        const breakup = taskName.match(/(.+?)(@[p])$/);
        split = breakup[1];
        runMode = 'parallel';
    }

    /**
     * Split the incoming taskname on colons
     *  eg: sass:site:dev
     *  ->  ['sass', 'site', 'dev']
     * @type {Array}
     */
    const splitTask = split.split(':');

    /**
     * Take the first (or the only) item as the base task name
     *  eg: uglify:*
     *  ->  'uglify'
     * @type {string}
     */
    const baseTaskName  = splitTask[0];
    const subTaskItems  = splitTask.slice(1);

    return {
        runMode,
        baseTaskName,
        subTaskItems,
        taskName,
        rawInput: taskName
    }
}