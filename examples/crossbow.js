module.exports = {
    watch: {
        default: {
            before: ['js', 'css', 'some-fake-task'],
            "test/fixtures/*.html": ['js']
        },
        dev: {
            before: ['bs'],
            "test/fixtures/*.html": ['js'],
            "test/fixtures/**/*.css": ['js', 'css']
        },
        watcher: {
            before: ['js:s'],
            "test/fixtures/*.html": ['js']
        }
    },
    tasks: {
        unit: "@npm sleep 1",
        "buildall@p": ['js', 'css'],
        js: [
            'test/fixtures/tasks/simple.js'
        ],
        'css@p': ['test/fixtures/tasks/simple.multi.js', 'error',  'test/fixtures/tasks/error.js', 'shane'],
        bs: ["test/fixtures/tasks/bs.js"],
        shane: function shaneFN(options, context, cb) {
            cb();
        },
        error: function (opts, ctx, observer) {
            var gulp = require('gulp');
            var through2 = require('through2');
            var count = 0;
            var to;
            return gulp.src('test/fixtures/js/*.js')
                .pipe(through2.obj(function (file, enc, cb) {
                    throw new Error('wa wa');
                }));
        }
    },
    config: {
        css: {
            name: "kittie"
        },
        sass: {
            input:  'test/fixtures/scss/main.scss',
            output: 'test/fixtures/css/main.min.css',
            root:   'test/fixtures/scss'
        },
        "babel-browserify": {
            input:  'test/fixtures/js/app.js',
            output: 'test/fixtures/js/dist/bundle.js',
            root:   'test/fixtures/js'
        },
        "test/fixtures/tasks/promise.js": {
            dev: {
                name: "kiittie"
            },
            normal: {
                name: "shane"
            }
        }
    }
};
