var Rx      = require('rx');
var sub     = new Rx.Subject();
var counter = 0;
setInterval(function () {
    sub.onNext(counter += 1);
}, 500);

var sub2     = new Rx.Subject();
var counter2 = 0;
setInterval(function () {
    sub2.onNext(counter2 += 1);
}, 100);

Rx.Observable
    .merge(sub, sub2)
    .do(x => console.log(x))
    .subscribe();
