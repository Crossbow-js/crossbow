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
            logger.info("{ok: } {cyan:%s {green:%sms}", path.join(' -> '), time);
            if (summary === 'verbose') {
                item.forEach(function (item) {
                    if (item.task.taskName !== displayPath) {
                        logger.info("{gray:-- }{cyan:%s", item.task.taskName);
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