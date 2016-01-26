module.exports = function (cli, tasks, config) {

    var methods = {

        getTasks: function getTasks(cliInput) {

            if (!cliInput.length) {

                if (tasks['default']) {
                    return tasks['default'];
                }

                throw new Error('No watch targets given and no `default` found');
            }

            var keys = Object.keys(tasks);
            var matching = cliInput.filter(function (x) {
                return keys.indexOf(x) > -1;
            });

            if (matching.length !== cliInput.length && config.get('strict')) {
                throw new Error('You tried to run the watch tasks `' + cliInput.join(', ') + '`' + ' but only  `' + matching.join(' ') + '` were found in your config.');
            }

            return matching.reduce(function (all, item) {
                return all.concat(tasks[item]);
            }, []);
        }
    };

    return methods;
};