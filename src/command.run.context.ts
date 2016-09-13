import {Task} from "./task.resolve";
import Immutable = require('immutable');
import {CommandTrigger} from "./command.run";
const {fromJS, Map} = Immutable;

import Rx = require('rx');

type PreExecutionTask = (tasks: Task[], trigger:CommandTrigger) => Rx.Observable<any>

/**
 * A task context is just an Immutable Map of key=>value pairs
 * that may be used to provide addition context to the task running
 * environment. This is especially useful in situations where you need
 * to do something that MUST block the task running altogether. An example
 * would be hashing files/directories to determine if a task/group of tasks should
 * run.
 */
export default function getContext (tasks: Task[], trigger: CommandTrigger): Rx.Observable<Immutable.Map<string, any>> {

    /**
     * Define a list of async actions
     * that must complete before any tasks are executed
     * @type {Array}
     */
    const preExecutionTasks : Array<PreExecutionTask> = [
        require('./command.run.pre-execution').createHashes
    ];

    /**
     * Now wrap each Function in an observable
     * @type {Rx.Observable<PreExecutionTask>[]}
     */
    const observables = preExecutionTasks.map((fn) => {
        return Rx.Observable.create(function (obs) {
            fn(tasks, trigger).subscribe(obs);
        });
    });

    /**
     * Run each item in sequence
     * finally producing an Immutable Map from all the gathered values
     */
    return Rx.Observable
        .from(observables)
        .concatAll()
        .toArray()
        .map(xs => {
            return Map({}).mergeDeep(...xs.map(x => fromJS(x)));
        });
}
