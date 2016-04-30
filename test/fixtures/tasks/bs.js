module.exports = function (opts, ctx, done) {

    ctx.tracker$.subscribe(function (x) {
        console.log('VALUE', x.type, x.item.seqUID);
    });
    
    done();
};
