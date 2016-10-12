const cli            = require('./dist/index');
const Rx             = require('rx');
const outputObserver = new Rx.Subject();
const signalObserver = new Rx.Subject();

const prepared       = cli.prepareInput({input: [], flags: {}}, null, outputObserver, signalObserver);

if (prepared.errors.length) {
    console.log(prepared.errors);
}

const input = prepared.userInput.inputs[0].tasks;

const topLevel = Object.keys(input);
console.log(topLevel);

// outputObserver.subscribe(function (out) {
//     // console.log(out);
// });
//
// const out = cli.default({
//     input: ['run', 'js'],
//     flags: {
//         outputObserver: outputObserver
//         // reporters: [
//         //
//         // ]
//     }
// }, {
//     tasks: {
//         js: function () {
//             // console.log('here');
//         }
//     }
// });
//
// // Setup
// // TaskReport[]
// // Complete
// out.subscribe(x => {
//     console.log(x);
// });
