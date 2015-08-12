function simple (obs) {
    //deferred.notify({level: 'debug', msg: ['Simple done']});
    //deferred.resolve();
    console.log('+ simple started');
    setTimeout(function () {
        console.log('- simple END');
        obs.onNext('Aww yeah');
        obs.onCompleted();
    }, 20);
}

module.exports.tasks = [simple];