var utils = require('./utils');
var basename = require('path').basename;
var objPath = require('object-path');
var Rx = require('rx');
var logger = require('./logger');
var gruntCompat = require('./grunt-compat');
var compat = require('./compat');
var t = require('./task-resolve');

module.exports = function (input, config) {

    input.tasks = input.tasks || {};

    var taskResolver = new t.create(input, config);

    var methods =  {
        /**
         * Resolve a given list of tasks (including alias)
         * @param {Array} tasks
         * @param {Object} input
         * @param {Immutable.Map} config
         * @returns {{valid: *, invalid: *}}
         */
        gather: taskResolver.gather.bind(taskResolver),
        createRunSequence: function (tasks) {
            return require('./sequence')(tasks, input, config);
        },
        /**
         * Create a Rx Observable stream
         * @param {Array} cliInput - task names such as 'js' or ['js','css']
         * @returns {Observable}
         */
        getRunner: function (cliInput, ctx) {

            var tasks    = methods.gather(cliInput);
            var sequence = methods.createRunSequence(tasks.valid);

            return require('./runner')(cliInput, ctx, tasks, sequence);
        }
    };

    return methods;
};