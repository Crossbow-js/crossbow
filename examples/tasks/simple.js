function simple (obs) {
    console.log('+ simple started');
    setTimeout(function () {
        obs.onNext('  On Next from Simple');
        obs.onNext('  On Next2 from Simple');
        console.log('- simple END');
        obs.onCompleted();
    }, 100);
}

module.exports.tasks = [simple];