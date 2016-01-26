var logger = require('./logger');
var seq    = require('./sequence');


module.exports = function (runner, config) {
    handleCompletion(runner.tasks.valid, runner.sequence, config);
};

/**
 * Logging for task completion
 */
function handleCompletion(tasks, sequence, config) {

    var summary = config.get('summary');
    var grouped = require('./sequence').groupByParent(sequence);

    if (summary === 'long' || summary === 'verbose') {
        grouped.forEach(function (item) {

            var time = require('./sequence').getSeqTime(item);

            logger.info('{ok: } {cyan:%s {green:%sms}', item.name, time);

            if (summary === 'verbose') {
                if (item.task.modules.length) {
                    logger.info('{gray:- %s}', item.task.modules[0]);
                }
                if (item.task.compat) {
                    return;
                }
                item.seq.taskItems.forEach(function (_item, i) {
                    logger.info('{gray:-- }%s {green:%sms}', i + 1, _item.duration);
                });
            }
        });
    }


    logger.info('{ok: } Completed without errors {green:(%sms total)', seq.getSeqTimeMany(sequence));
}
