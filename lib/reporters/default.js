var logger = require('../logger');
var seq    = require('../sequence');

module.exports = function (runner, config, time) {
    handleCompletion(runner.tasks.valid, runner.sequence, config, time);
};

/**
 * Logging for task completion
 */
function handleCompletion(tasks, sequence, config, time) {

    var summary = config.get('summary');
    var grouped = seq.groupByParent(sequence);

    if (summary === 'long' || summary === 'verbose') {

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
    }


    logger.info('{ok: } Completed {green:(%sms total)', time);
}
