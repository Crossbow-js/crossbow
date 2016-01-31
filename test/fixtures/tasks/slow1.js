function slow1 (obs, opts, ctx) {
    console.log('Starting slow 1');
    console.log(ctx);
    setTimeout(x => {
        console.log('Finished slow 1');
        obs.done();
    }, 3000);
}

module.exports = slow1;