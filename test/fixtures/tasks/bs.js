module.exports = function (opts, ctx, observer, tracker$) {

    tracker$.subscribe(function (x) {
        console.log('VALU', x.type, x.item.seqUID);
    });

    observer.done();
};
