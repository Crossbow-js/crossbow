var path = require('path');
var exec = require('child_process').exec;

module.exports = function (input, config, item) {

    return function (obs) {
        exec(item.rawInput, { cwd: config.get('cwd') }, function (error, stdout, stderr) {
            if (error !== null) {
                //console.log('exec error: ' + error);
                return obs.onError(error);
            } else {
                obs.log.info(stdout);
            }
            obs.onCompleted();
        });
    };
};