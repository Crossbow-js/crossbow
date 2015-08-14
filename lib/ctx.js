var fs = require('fs');
var _write2 = require('fs').writeFileSync;
var _read = require('fs').readFileSync;
var mkdirp = require('mkdirp');
var path = require('path');
var _resolve = require('path').resolve;
var _exists = require('fs').existsSync;
var dirname = require('path').dirname;
var objPath = require('object-path');
var vfs = require('vinyl-fs');

module.exports = function (opts) {

    opts = opts || {};
    opts.cwd = opts.cwd || process.cwd();
    opts.config = opts.config || opts.crossbow.config || {};

    var options = Object.keys(opts.config).reduce(function (obj, key) {
        if (!obj[key]) {
            obj[key] = opts.config[key].options;
        }
        return obj;
    }, {});

    function getLookup() {

        var args = Array.prototype.slice.call(arguments);

        var lookup = args[0];

        if (!lookup.match(/\./) && !Array.isArray(lookup)) {
            lookup = args;
        }

        return lookup;
    }

    var optObj = objPath(options);

    var ctx = {
        exists: function exists(path) {
            return _exists(_resolve(opts.cwd, path));
        },
        resolve: function resolve(path) {
            return _resolve(opts.cwd, path);
        },
        get: function get() {
            return objPath.get(opts.crossbow, getLookup.apply(null, arguments));
        },
        options: optObj,
        opts: opts,
        vfs: vfs,
        path: {
            /**
             * Look up paths such as sass.root
             * @returns {*}
             */
            make: function make(path) {
                return _resolve(opts.cwd, path);
                //var lookup = objPath.get(opts.crossbow, getLookup.apply(null, arguments));
                //if (!lookup) {
                //    lookup = objPath.get(opts.config, getLookup.apply(null, arguments));
                //}
                //if (!lookup) {
                //    var args = Array.prototype.slice.call(arguments);
                //    throw new TypeError('Could not find configuration item: ' + args.join('.') + ' Please check your config');
                //}
                //return resolve(opts.cwd, lookup);
            }
        },
        file: {
            /**
             * Write a file using path lookup
             * @param filepath
             * @param content
             */
            write: function write(filepath, content) {
                mkdirp.sync(dirname(filepath));
                _write2(filepath, content);
            },
            _write: function _write(filepath, content) {
                mkdirp.sync(dirname(filepath));
                _write2(filepath, content);
            },
            /**
             * Write a file using path lookup
             * @param filepath
             */
            read: function read(filepath) {
                var inpath = ctx.path.make(filepath);
                return _read(inpath, 'utf-8');
            }
        },
        config: opts.config,
        paths: opts.config,
        root: process.cwd(),
        crossbow: opts.crossbow,
        mkdirp: mkdirp,
        trigger: {}
    };

    return ctx;
};