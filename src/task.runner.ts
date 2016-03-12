const Rx = require('rx');

import {Tasks} from "./task.resolve";
import {SequenceItem} from "./task.sequence.factories";
import {Runner} from "./runner";
import {RunCommandTrigger, CommandTrigger} from './command.run';
const debug = require('debug')('cb:task.runner');
const assign = require('object-assign');
import logger from './logger';
import handleReturn from './task.return.values';

export interface TaskRunner {
    tasks: Tasks
    sequence: SequenceItem[]
    runner: Runner
}

export interface TaskStats {
    startTime: number
    endTime: number
    duration: number
    completed: boolean
    errored: boolean
    item: SequenceItem
    taskUID: number
}

export interface TaskReport {
    stats: TaskStats
    type: string
}

var taskUID = 0;

/**
 * This creates a wrapper around the actual function that will be run.
 * This done to allow the before/after reporting to work as expected for consumers
 */
export function createObservableFromSequenceItem(item: SequenceItem, trigger: CommandTrigger) {

    return Rx.Observable.create(outerObserver => {

        const stats = <TaskStats>{
            startTime: new Date().getTime(),
            endTime: 0,
            duration: 0,
            completed: false,
            errored: false,
            item: item
        };

        outerObserver.onNext(<TaskReport>{type: 'start', stats: stats});

        getInnerTaskRunnerAsObservable(item, trigger)
            .subscribe(function () {
                // todo: What to do with tasks that produce vales through given observer.onNext()?
            }, err => {
                outerObserver.onError(err);
            }, _ => {
                outerObserver.onNext(<TaskReport>{type: 'end', stats: getEndStats(stats)});
                outerObserver.onCompleted();
            })
    });
}

/**
 * Create a new stats object with completed/duration flags etc
 */
function getEndStats(stats: TaskStats) {
    const now = new Date().getTime();
    return assign({}, stats, {
        endTime: now,
        duration: now - stats.startTime,
        completed: true
    })
}

function getInnerTaskRunnerAsObservable (item, trigger) {
    return Rx.Observable.create(observer => {

            observer.done = function () {
                observer.onCompleted();
            };

            process.nextTick(function () {

                var output;

                try {
                    output = item.factory(item.config, trigger, observer);
                } catch (e) {
                    return observer.onError(e);
                }

                /**
                 * If the task did return something, we can look at the
                 * type of it's value to work out how to handle to complete the task
                 */
                if (output !== undefined) {
                    return handleReturn(output, observer);
                }

                /**
                 * If the argument length is less than 3, it means the user
                 * has not asked for access to the observer - which means
                 * we can complete the task immediately
                 */
                if (item.factory.length < 3) {
                    return observer.onCompleted();
                }

                /**
                 * At this point, the user has asked for access to the observer (the 3rd arg)
                 * so we need to assume the user is going to call done on it.
                 */

            });
        })
        .catch(function (e) {
            item.errored = true;
            const msg = ('The following error is from the task' + item.task.taskName).length;
            const lineLength = new Array(msg).join('-');
            logger.info('{gray: ----' + lineLength);
            logger.info('{err: } The following error is from the task', item.task.taskName);
            logger.info('{gray: ----' + lineLength);

            if (!e) {
                e = new Error(`Error Message not provided for ${item.task.taskName}`);
                e._cbStack = [`Task: ${item.task.taskName}`, ` msg: No message was provided`].join('\n');
            }

            if (typeof e === 'string') {
                const msg = e;
                e = new Error(e);
                e._cbStack = [`Task: ${item.task.taskName}`, ` msg: ${msg}`].join('\n');
            }

            // todo: reporter: allow logging here
            if (trigger.config.exitOnError === true) {
                debug('Exiting because exitOnError === true');
                return Rx.Observable.throw(e);
            } else {
                debug('Displaying error but continuing as exitOnError === false');
                console.log(e.stack);
                return Rx.Observable.empty();
            }
        });
}
