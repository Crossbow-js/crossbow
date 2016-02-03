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

    if (!tasks.length) {
        return;
    }

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
        logger.info('Adaptor not found for task type {cyan:`%s`}', task.taskName);
    },
    MODULE_NOT_FOUND: (task) => {
        logger.info('{cyan:`%s`} could not be located', task.taskName);
    },
    SUBTASK_NOT_FOUND: (task, error) => {
        logger.info('{cyan:`%s`} sub task of {cyan:`%s`} not found', error.name, task.taskName);
        //logger.info(`{cyan:\`crossbow %s:%s\`} means run the task {cyan:${task.taskName}}`, task.taskName, error.name);
        //logger.info('with the configuration found under {cyan:`%s.%s`}', task.taskName, error.name);
        logger.info(`

Running the command:
{cyan:$ ${task.taskName}:${error.name}}

Would require configuration along the lines of:
{yellow:config:
  '${task.taskName}':
    '${error.name}':
      input: 'core.scss'
      output: 'core.css'}`);
    },
    SUBTASK_NOT_PROVIDED: (task, error) => {
        logger.info(`Sub-task not provided for {cyan:${task.taskName}}

When you use a colon {yellow::} separator, you need to provide a key-name after
that matches in your config.

For example, running the command:
{cyan:$ ${task.taskName}:fakeSubTask}

Will look at your config for an item under \`{cyan:${task.taskName}}\` with the key \`{cyan:fakeSubTask}\`.
Something like this:

{yellow:config:
  ${task.taskName}:
    fakeSubTask:
      input: 'core.scss'
      output: 'core.css'}
        `)
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
            if (task.errors.length) {
                task.errors.forEach(function (error) {
                    if (typeof errors[error.type] === 'function') {
                        errors[error.type].call(null, task, error);
                    }
                });
            } else {
                console.log('GENERIC TASK ERROR');
            }
            //if (task.tasks.length) {
            //    doErrors(task.tasks);
            //}
        })
    }

    doErrors(tasks.invalid);
};
