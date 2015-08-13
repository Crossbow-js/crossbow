function simple2 (obs) {
    console.log('+ simple2 started');
    setTimeout(function () {
        obs.onNext('  On Next from Simple 2');
        obs.onNext('  On Next2 from Simple 2');
        obs.onNext('  On Next3 from Simple 2');
        obs.onNext('  On Next4 from Simple 2');
        console.log('- simple2 END');
        obs.onCompleted();
    }, 20);
}

module.exports.tasks = [simple2];