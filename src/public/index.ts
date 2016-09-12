import {api} from './create';
import handleIncoming from '../index';
import {TaskRunner} from "../task.runner";

const _ = require('../../lodash.custom');
module.exports = api;

module.exports.getRunner = function getRunner(tasks: string[], input?: any, config?: any) {
    return handleIncoming({
        input: ['run', ...tasks],
        flags: _.assign({handoff: true}, config)
    }, input || {});
};

module.exports.getWatcher = function getWatcher(tasks: string[], input?: any, config?: any) {
    return handleIncoming({
        input: ['watch', ...tasks],
        flags: _.assign({handoff: true}, config)
    }, input || {});
};

module.exports.runner = function getRunner(tasks: string[], input?: any, config?: any) {
    const result = handleIncoming<TaskRunner>({
        input: ['run', ...tasks],
        flags: _.assign({handoff: true}, config)
    }, input || {});
    return result.runner;
};

module.exports.run = function run(tasks: string[], input?: any, config?: any) {
    return handleIncoming({
        input: ['run', ...tasks],
        flags: config || {}
    }, input || {});
};
