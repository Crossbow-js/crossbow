module.exports = function (opts, ctx, observer) {

    ctx.tracker$.subscribe(function (x) {
        console.log('VALUE', x.type, x.item.seqUID);
    });
    
    observer.done();
};
