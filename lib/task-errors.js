const objPath = require('object-path');

module.exports = function (locatedModules, childTasks, subTaskItems, baseTaskName, input) {

    /**
     * If a module was not located, and there are 0 child tasks,
     * this can be classified as a `module not found error`
     */
    const moduleError = (locatedModules.length === 0 && childTasks.length === 0)
        ? [{type: 'MODULE_NOT_FOUND'}]
        : [];

    /**
     * Now validate any subtasks given with colon syntax
     *  eg: sass:dev
     *   -> must have a configuration object under the key sass.dev
     *   -> VALID
     *      config:
     *        sass:
     *          dev: 'input.scss'
     */

    return subTaskItems.reduce((all, name) => {
        /**
         * if a star was given as a subTask,
         * then this item must have configuration
         * as we'll want to run once with each key
         */
        if (name === '*') {
            const configKeys = Object.keys(objPath.get(input, ['config'].concat(baseTaskName), {}));
            if (!configKeys.length) {
                return all.concat({
                    type: 'SUBTASKS_NOT_IN_CONFIG',
                    name: name
                });
            }
            return all;
        }
        if (name === '') {
            return all.concat({
                type: 'SUBTASK_NOT_PROVIDED',
                name: name
            });
        }
        const match = objPath.get(input, ['config'].concat(baseTaskName, name));
        if (match === undefined) {
            return all.concat({
                type: 'SUBTASK_NOT_FOUND',
                name: name
            });
        }
    }, moduleError);
}