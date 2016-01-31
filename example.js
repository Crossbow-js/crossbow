//var cli = require('./');
//
//cli({
//    input: [
//        'run',
//        '$bgShell watchify {{watchify.input}} -v -d -o {{watchify.output}}',
//        '$bgShell webpack {{webpack.input}} --output-file {{webpack.output}} --watch',
//    ]
//}, {
//    crossbow: {
//        config: {
//            watchify: {
//                input: 'test/fixtures/js/app.js',
//                output: 'test/fixtures/js/app.watchify.js',
//            },
//            webpack: {
//                input: 'test/fixtures/js/app2.js',
//                output: 'test/fixtures/js/app2.webpack.js',
//            }
//        }
//    }
//}, function (err, output) {
//    //console.log(output);
//    //assert.equal(output.sequence[0].seq.taskItems.length, 1);
//    //assert.equal(output.sequence[0].seq.taskItems[0].FUNCTION.name, 'simple');
//    //assert.equal(output.sequence[1].seq.taskItems.length, 1);
//    //assert.equal(output.sequence[1].seq.taskItems[0].FUNCTION.name, 'simple2');
//    //assert.equal(output.sequence[2].seq.taskItems.length, 2);
//    //done();
//});
//
////console.log('kittie');
//const Rx = require('rx');
//
//Rx.
