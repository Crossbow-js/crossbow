"use strict";
const Rx     = require('rx');
const assert = require('assert');
const O      = Rx.Observable;
const concat = O.concat;
const merge  = O.merge;
const empty  = O.empty;

/**
 * Function under test - handle a concat stream of tasks
 * @returns {ReplaySubject<T>}
 */
module.exports = function handleConcat (tasks) {
    const subject = new Rx.ReplaySubject(2000);
    const catchTasks = tasks.map(x => x.catch(x => empty()));
    tasks.forEach(function (item) {
        // console.log(item);
    })
    O.from(catchTasks)
        .mergeAll()
        .do(subject)
        .subscribe(x => {}, e=>{}, _=> {
            // console.log('All done');
        });
    return subject;
};


module.exports.mergeFnNamed = function (tasks) {
    const subject = new Rx.ReplaySubject(2000);

    // const catchTasks = tasks.map(x => x.catch(x => empty()));

    const ls = getItems(tasks, [], true);
    
    function getItems (items, initial, addCatch) {

        return items.reduce(function (acc, item) {
            let output;
            if (item.type === 'P') {
                // console.log('+',item.type, addCatch);
                output = merge(getItems(item.items, [], true));
            }
            if (item.type === 'S') {
                // console.log('+',item.type, addCatch);
                output = concat(getItems(item.items, []));
            }
            if (item.type === 'T') {
                // console.log('+',item.type, addCatch);
                output = item.task;
            }
            if (addCatch) {
                return acc.concat(output.catch(x => empty()));
            }
            return acc.concat(output);
        }, initial);
    }

    O.from(ls)
        .mergeAll()
        .do(subject)
        .subscribe(x => {}, e=>{}, _=> {
            // console.log('All done');
        });
    return subject;
};
