module.exports = function (cli, tasks, config) {

    var methods = {

        getTasks: function (cliInput) {

            if (!cliInput.length) {

                if (tasks['default'].items) {
                    return tasks['default'].items;
                }

                throw new Error('No watch targets given and no `default` found');
            }

            var keys = Object.keys(tasks);
            var matching = cliInput.filter(x => keys.indexOf(x) > -1);

            if (matching.length !== cliInput.length && config.get('strict')) {
                throw new Error('You tried to run the watch tasks `' + cliInput.join(', ') + '`' +
                    ' but only  `' + matching.join(' ') + '` were found in your config.');
            }

            return matching.reduce((all, item) => {
                return all.concat(tasks[item].items);
            }, []);
        }
    };

    return methods;
};