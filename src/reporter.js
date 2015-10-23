var logger        = require('./logger');

module.exports = function (runner, config) {
    handleCompletion(runner.tasks.valid, runner.sequence, config);
}

/**
 * Logging for task completion
 */
function handleCompletion(tasks, sequence, config) {

    var summary = config.get('summary');

    var aliased = sequence.reduce(function (all, item) {
    	if (!all[item.task.parent]) {
            all[item.task.parent] = [item];
        } else {
            all[item.task.parent].push(item);
        }
        return all;
    }, {});

    if (summary === 'long' || summary === 'verbose') {
        Object.keys(aliased).forEach(function (key) {
            var item = aliased[key];
            var path = key.split('.').slice(1);
            var time = getSeqTime(item);
            logger.info("{ok: } {cyan:%s {green:%sms}", path.join(' -> '), time);
            if (summary === 'verbose') {
                item.forEach(function (item) {
                    logger.info("{gray:- }{cyan:%s", item.task.taskName);
                	item.seq.taskItems.forEach(function (item, i) {
                        logger.info("{gray:- }%s {green:%sms}", i + 1, item.duration);
                	});
                });
            }
        });
    }

    logger.info('{ok: } Completed without errors {green:(%sms total)', getSeqTime(sequence));
}

function getSeqTime(seq) {
    return seq.reduce(function (all, seq) {
        return all + seq.seq.taskItems.reduce(function (all, item) {
            return all + item.duration;
        }, 0);
    }, 0);
}