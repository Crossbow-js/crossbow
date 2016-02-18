const Rx = require('rx');

import {Tasks} from "./task.resolve";
import {SequenceItem} from "./task.sequence.factories";
import {Runner} from "./runner";
import {RunCommandTrigger} from './command.run';
const debug = require('debug')('cb:task.runner');
import logger from './logger';
import handleReturn from './task.return.values';

export interface TaskRunner {
    tasks: Tasks
    sequence: SequenceItem[]
    runner: Runner
}

export function createObservableFromSequenceItem(item: SequenceItem, trigger: RunCommandTrigger) {
    return Rx.Observable.create(observer => {
            observer.done = function () {
                observer.onCompleted();
            };
            item.startTime = new Date().getTime();
            process.nextTick(function () {

                var output;

                try {
                    output = item.factory(item.opts, trigger, observer);
                } catch (e) {
                    observer.onError(e);
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
            const msg = ('The following error is from the task'  +  item.task.taskName).length;
            const lineLength = new Array(msg).join('-');
            logger.info('{gray: ----' + lineLength);
            logger.info('{err: } The following error is from the task ', item.task.taskName);
            logger.info('{gray: ----' + lineLength);
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