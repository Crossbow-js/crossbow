const assert = require('chai').assert;
const exec = require('child_process').execSync;
const fs = require('fs');
const path = require('path');

describe("Skipping tasks if files changed", function () {
    it("writes new file", function () {

        require('rimraf').sync('.crossbow');

        const input = {
            tasks: {
                js: {
                    ifChanged: ['test/fixtures/js'],
                    tasks: ['@npm sleep 0.1']
                }
            }
        };

        const json    = JSON.stringify(input);
        const escaped = json.replace(/"/g, '\\\"');

        const e = exec(`node dist/cb run js --fromJson="${escaped}"`);
        const resolved = path.join(process.cwd(), 'test', 'fixtures', 'js');
        const written = JSON.parse(fs.readFileSync(path.join('.crossbow', 'history.json'), 'utf8'));

        assert.equal(written.hashes.length, 1);
        assert.equal(written.hashes[0].userInput, 'test/fixtures/js');
        assert.equal(written.hashes[0].resolved, resolved);
        assert.equal(written.hashes[0].changed, true);
    });
    it("Adds to existing file", function () {

        require('rimraf').sync('.crossbow');

        const input = {
            tasks: {
                js: {
                    ifChanged: ['test/fixtures/js'],
                    tasks: ['@npm sleep 0.1']
                },
                css: {
                    ifChanged: ['test/fixtures/css/main.css'],
                    tasks: ['@npm sleep 0.1']
                }
            }
        };

        const json    = JSON.stringify(input);
        const escaped = json.replace(/"/g, '\\\"');

        const e = exec(`node dist/cb run js --fromJson="${escaped}"`);

        exec(`node dist/cb run css --fromJson="${escaped}"`);

        const resolved1 = path.join(process.cwd(), 'test', 'fixtures', 'js');
        const resolved2 = path.join(process.cwd(), 'test', 'fixtures', 'css', 'main.css');

        const written = JSON.parse(fs.readFileSync(path.join('.crossbow', 'history.json'), 'utf8'));

        assert.equal(written.hashes.length, 2);
        assert.equal(written.hashes[0].userInput, 'test/fixtures/js');
        assert.equal(written.hashes[0].resolved, resolved1);
        assert.equal(written.hashes[0].changed, true);

        assert.equal(written.hashes[1].userInput, 'test/fixtures/css/main.css');
        assert.equal(written.hashes[1].resolved, resolved2);
        assert.equal(written.hashes[1].changed, true);
    });
    it("Updates existing file with same run", function () {

        require('rimraf').sync('.crossbow');

        const input = {
            tasks: {
                js: {
                    ifChanged: ['test/fixtures/js'],
                    tasks: ['@npm sleep 0.1']
                }
            }
        };

        const json    = JSON.stringify(input);
        const escaped = json.replace(/"/g, '\\\"');

        exec(`node dist/cb run js --fromJson="${escaped}"`); // 1

        var written = JSON.parse(fs.readFileSync(path.join('.crossbow', 'history.json'), 'utf8'));
        assert.equal(written.hashes[0].changed, true);

        exec(`node dist/cb run js --fromJson="${escaped}"`); // 2

        written = JSON.parse(fs.readFileSync(path.join('.crossbow', 'history.json'), 'utf8'));
        assert.equal(written.hashes[0].changed, false);
    });
    it("does not write to disk if --dryRun", function () {

        require('rimraf').sync('.crossbow');

        const input = {
            tasks: {
                js: {
                    ifChanged: ['test/fixtures/js'],
                    tasks: ['@npm sleep 0.1']
                }
            }
        };

        const json    = JSON.stringify(input);
        const escaped = json.replace(/"/g, '\\\"');

        exec(`node dist/cb run js --fromJson="${escaped}" --dryRun`);

        assert.equal(fs.existsSync(path.join('.crossbow', 'history.json')), false);
    });
});
