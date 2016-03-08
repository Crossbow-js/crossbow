const Rx = require('rx');

import {Tasks} from "./task.resolve";
import {SequenceItem} from "./task.sequence.factories";
import {Runner} from "./runner";
import {RunCommandTrigger, CommandTrigger} from './command.run';
const debug = require('debug')('cb:task.runner');
import logger from './logger';
import handleReturn from './task.return.values';

export interface TaskRunner {
    tasks: Tasks
    sequence: SequenceItem[]
    runner: Runner
}

export function createObservableFromSequenceItem(item: SequenceItem, trigger: CommandTrigger) {
    return Rx.Observable.create(observer => {
            observer.done = function () {
                observer.onCompleted();
            };

            process.nextTick(function () {

                item.startTime = new Date().getTime();
                item.duration  = 0;
                item.completed = false;

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

            return () => {
                item.endTime   = new Date().getTime();
                item.duration  = item.endTime - item.startTime;
                item.completed = true;
            }
        })
        .catch(function (e) {
            item.errored = true;
            const msg = ('The following error is from the task'  +  item.task.taskName).length;
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
