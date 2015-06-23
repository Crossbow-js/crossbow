var assert      = require('chai').assert;
var watch       = require('../');
var cwd         = require('path').resolve('test/fixtures');
var current     = process.cwd();
var gather      = require('../lib/gather-tasks');
var getBsConfig = require('../lib/utils').getBsConfig;

describe('Running Watch tasks', function () {
    it('can gather simple tasks', function () {

        watch({input: ['watch']}, {
            pkg: {
                crossbow: {
                    watch: {
                        "default": [
                            {
                                "**/*.js": "babel"
                            }
                        ],
                        "someother": [
                            {
                                "app/**/*.js": "babel2"
                            }
                        ]
                    }
                }
            }
        });
    });
});