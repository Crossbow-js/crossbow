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
                    tasks: ['@npm sleep 1']
                }
            }
        };

        const json = JSON.stringify(input);
        const escaped = json.replace(/"/g, '\\\"');

        const e = exec(`node dist/cb run js --fromJson="${escaped}"`);
        const resolved = path.join(process.cwd(), 'test', 'fixtures', 'js');
        const written = JSON.parse(fs.readFileSync(path.join('.crossbow', 'history.json'), 'utf8'));

        assert.equal(written.hashes.length, 1);
        assert.equal(written.hashes[0].userInput, 'test/fixtures/js');
        assert.equal(written.hashes[0].resolved, resolved);
        assert.equal(written.hashes[0].changed, true);
    });
});
