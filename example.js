'use strict';

var rx = require('rx');
var O = rx.Observable;

function fac(name) {
    return O.create(obs => {
        console.log('running: ', name);
        let i = setTimeout(function () {
        	obs.onNext(name);
        	obs.onCompleted();
        }, 500);
        return () => {
            if (i) {
                console.log('cleaning:', name);
                clearTimeout(i);
            }
        }
    });
}


var array = [
    fac(1),
    fac(2),
    O.concat(
        fac(3),
        fac(4),
        O.merge(
            fac(5),
            fac(6)
        )
    )
];

const q = O.from(array).mergeAll();

const sub = q.subscribe(x => {
        console.log('value:   ', x)
    }, e => {
        console.error(e)
    }, _ => {
        console.log('DONE');
    });

setTimeout(function () {
	sub.dispose();
}, 600);