var cmd = require('./shell-compat');

module.exports = function (input, config, item) {
    return function (obs) {
        return cmd.cmd('npm run ' + item.rawInput.split(' ').join(' && npm run '), config.get('cwd'), obs);
    };
};
