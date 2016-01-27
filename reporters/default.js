var logger = require('../lib/logger');
var seq    = require('../lib/sequence');

module.exports = function (runner, config, time) {
    handleCompletion(runner.tasks.valid, runner.sequence, config, time);
};

/**
 * Logging for task completion
 */
function handleCompletion(tasks, sequence, config, time) {

    var summary = config.get('summary');
    var grouped = seq.groupByParent(sequence);

    if (summary !== 'long' && summary !== 'verbose') {
        logger.info('{ok: } Completed {green:(%sms total)', time);
        return;
    }

    grouped.forEach(function (item) {

        var time = seq.getSeqTime(item);

        logger.info('{ok: } {cyan:%s {green:%sms}', item.name, time);

        if (summary === 'verbose') {
            if (item.task.modules.length) {
                logger.info('{gray:- %s}', item.task.modules[0]);
            }
            if (item.task.compat) {
                return;
            }
            item.seq.taskItems.forEach(function (_item, i) {
                logger.info('{gray:-- }[%s] {green:%sms}', i + 1, _item.duration);
            });
        }
    });

    logger.info('{ok: } Completed {green:(%sms total)', time);
}

/**
 * Error message support
 * @type {{COMPAT_NOT_FOUND: errors.COMPAT_NOT_FOUND, MODULE_NOT_FOUND: errors.MODULE_NOT_FOUND}}
 */
const errors = {
    COMPAT_NOT_FOUND: (task) => {
        return ['Adaptor not found for task type {cyan:`%s`}', task.taskName];
    },
    MODULE_NOT_FOUND: (task) => {
        return ['{cyan:`%s`} could not be located', task.taskName];
    }
};

/**
 * Handle invalid error messages
 * @param tasks
 */
module.exports.outputErrorMessages = function (tasks) {

    logger.error('{red:x warning} %s Invalid Task%s', tasks.invalid.length, tasks.invalid.length > 1 ? 's' : '');

    function doErrors(invalidTasks) {
        invalidTasks.forEach(function (task) {
            task.errors.forEach(function (e) {
                logger.error.apply(logger, errors[e].call(null, task));
            });
            if (task.tasks.length) {
                doErrors(task.tasks);
            }
        })
    }

    doErrors(tasks.invalid);
};