//var cli = require("./cli");
//var assert = require("assert");
//
//cli({input: ["watch"]}, {
//    crossbow: {
//        watch:  {
//            'bs-config': {
//                server: 'test/fixtures',
//                logFileChanges: false,
//                open: false
//            },
//            'tasks': {
//                "test/fixtures/scss":   ["sass", "bs:reload:*.css"],
//                "test/fixtures/js":     ["test/fixtures/task.js", "bs:reload"],
//                "test/fixtures/*.html": ["bs:reload"]
//            }
//        },
//        config: {
//            sass: {
//                input:  'test/fixtures/scss/main.scss',
//                output: 'test/fixtures/css/main.min.css',
//                root:   'test/fixtures/scss'
//            }
//        }
//    }
//});

var Rx = require('rx');

Rx.Observable.fromArray([
    Rx.Observable.just(10),
    Rx.Observable.create(function (obs) {
        console.log('Running');
        var other = setTimeout(function () {
            console.log('Completed');
            obs.onCompleted();
        }, 1000);
        //var int = setTimeout(function () {
        //}, 50);
        obs.onError(new Error('OH NO'));
        return function () {
            console.log('disposing');
            clearTimeout(other);
        }
    }),
    Rx.Observable.just(20)
])
.mergeAll()
.subscribe(function (val) {
    console.log('val:', val);
}, function (e) {
    console.log('error', e);
}, function () {
    console.log('done');
});