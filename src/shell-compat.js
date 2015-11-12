var exec = require('child_process').exec;

module.exports = function (input, config, item) {

    return function (obs) {
        cmd(item.rawInput, config.get('cwd'), obs);
    };
};

function cmd(cmd, cwd, obs) {
    return exec(cmd, {cwd: cwd}, function (error, stdout) {
        if (error !== null) {
            return obs.onError(error);
        } else {
            obs.log.info('-- stdout start --');
            obs.log.info('\n' + stdout);
            obs.log.info('-- stdout end --');
        }
        obs.onCompleted();
    });
}

module.exports.cmd = cmd;
