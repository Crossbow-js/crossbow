import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import logger from "../logger";
export function summary (sequence: SequenceItem[], cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {

    if (config.summary !== 'short') {
        logTasks(sequence, '');
    }

    logger.info('Total: {yellow:(%sms)}', timeall(sequence, 0));

    function logTasks (sequence, indent) {
        sequence.forEach(function (item) {
            if (item.type === SequenceItemTypes.Task) {
                return logger.info('{gray:%s}{cyan:%s} {yellow:(%sms)}', indent.length ? indent + ' ': '', item.task.taskName, item.duration);
            }
            logger.info('{gray:%s}{white.bold.underline:%s} ', indent.length ? indent + ' ': '', item.taskName);
            logTasks(item.items, indent + '-');
        });
    }
    function timeall (sequence, initial) {
        return sequence.reduce((a, item) => {
            if (item.type === SequenceItemTypes.Task) {
                return a + item.duration;
            }
            return a + timeall(item.items, a);
        }, initial);
    }
}