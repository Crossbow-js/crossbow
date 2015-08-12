function simple2 (obs) {
    console.log('+ simple2 started');
    setTimeout(function () {
        console.log('- simple2 END');
        obs.onNext('Aww yeah 2');
        obs.onCompleted();
    }, 20);
}

module.exports.tasks = [simple2];