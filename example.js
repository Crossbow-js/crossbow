const Rx = require('rx');
const scheduler = new Rx.TestScheduler();
const output = new Rx.ReplaySubject(100, null, scheduler);

scheduler.advanceBy(4000);

setTimeout(function () {
    console.log('after');
}, 0);

output.onNext('shane');
output.onNext('shane');
output.onNext('shane');

output.subscribe(x => {
    console.log(x);
});
