module.exports = function (opts, ctx, observer, tracker$) {

    // console.log(ctx);
    tracker$.subscribe(function (x) {
        console.log('VALU', x.type, x.item.seqUID);
    });

    observer.done();
};
