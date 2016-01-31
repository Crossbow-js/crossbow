function slow1 (obs) {
    console.log('Starting slow 1');
    setTimeout(x => {
        console.log('Finished slow 1');
        obs.done();
    }, 3000);
}

module.exports = slow1;