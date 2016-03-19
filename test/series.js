const Rx     = require('rx');
const O      = Rx.Observable;

/**
 * Run a group of tasks in series.
 * Any error in any group will cause the entire process
 * to exit
 */
module.exports = function handleConcat (tasks) {
    const subject = new Rx.ReplaySubject(2000);
    O.from(tasks)
        .concatAll()
        .catch(e => { // global error
            // At this point, the error will have dis-continued any other tasks that are running
            // so we can have a look at the subject that contains
            // All previous messages and decide what to do:
            // ie: Might want to exit the process with an exitcode of non-zero

            // Access subject here to look at all previous messages
            // subject.forEach(function (msg) {
            //     console.log('item', msg);
            // });
            // report('from catch', subject);
            return O.never();
        })
        /**
         * Push any messages into the subject
         */
        .do(subject)
        .subscribe(x=>{}, e=>{}, _=> {
            console.log('All done');
        });
    return subject;
};
