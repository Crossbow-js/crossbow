var logger        = require('./logger');


module.exports = function (runner, config) {
    handleCompletion(runner.tasks.valid, runner.sequence, config);
}

/**
 * Logging for task completion
 */
function handleCompletion(tasks, sequence, config) {

    var summary = config.get('summary');
    var grouped = require('./sequence').groupByParent(sequence);

    if (summary === 'long' || summary === 'verbose') {
        Object.keys(grouped).forEach(function (key) {
            var item = grouped[key];
            var path = key.split(' ').filter(x => x.length);
            var displayPath = path.join(' -> ');

            var time = require('./sequence').getSeqTime(item);
            logger.info("{ok: } {cyan:%s {green:%sms}", displayPath, time);

            if (summary === 'verbose') {
                item.forEach(function (item) {
                    var displayName = item.task.taskName;
                    if (item.task.compat) {
                        displayName = `($${item.task.compat}) ${item.task.rawInput}`;
                    }
                    logger.info('{cyan:%s}', item.task.modules[0]);
                    if (item.task.taskName !== displayPath) {
                        logger.info("{gray:-- }{cyan:%s", displayName);
                    }
                	item.seq.taskItems.forEach(function (item, i) {
                        logger.info("{gray:-- }%s {green:%sms}", i + 1, item.duration);
                	});
                });
            }
        });
    }

    logger.info('{ok: } Completed without errors {green:(%sms total)', require('./sequence').getSeqTime(sequence));
}