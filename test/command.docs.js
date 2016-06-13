const assert = require('chai').assert;
const Rx = require('rx');
const cli = require("../dist/index");
const errorTypes = require('../dist/task.errors').TaskErrorTypes;
const RunCommandReportTypes = require('../dist/command.run').RunCommandReportTypes;

describe('Running docs commands', function () {
    it('reports when a task is completed', function () {
    	const output = cli.default({
            input: ['docs'],
            flags: {
                handoff: true
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });
        const expected = `## Crossbow tasks

The following tasks have been defined by this project's Crossbow configuration.
Run any of them in the following way
 
\`\`\`shell
$ crossbow run <taskname>
\`\`\`
|Task name|Description|
|---|---|
|<pre>\`build-css\`</pre>|**Alias for:**<br>- \`css\`<br>- \`version-rev\`|
|<pre>\`version-rev\`</pre>|**Alias for:**<br>- \`@sh versioner | xargs ls\`|
|<pre>\`css\`</pre>|**Alias for:**<br>- \`@npm node-sass\`<br>- \`@npm cssmin\`|`;
        assert.equal(expected, output.markdown);
    });
    it.only('handles missing file', function () {
        const testfile = 'test/fixtures/docs/readme-typo.md';
        const output = cli.default({
            input: ['docs'],
            flags: {
                file: testfile,
                handoff: true
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });
        assert.equal(output.errors.length, 1);
    });
    it('Looks at an existing file', function () {
        const testfile = 'test/fixtures/docs/readme-no-existing.md';
        const output = cli.default({
            input: ['docs'],
            flags: {
                file: testfile,
                handoff: true
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });

        const before = require('fs').readFileSync(testfile, 'utf8');

        assert.equal([before, output.markdown].join('\n'), output.output[0].content);
    });
});
