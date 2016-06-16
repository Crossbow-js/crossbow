const assert = require('chai').assert;
const cli = require("../dist/index");
const DocsErrorTypes = require('../dist/command.docs').DocsErrorTypes;
const docs = require('../dist/command.docs');

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
        const expected = `<!--crossbow-docs-start-->
## Crossbow tasks

The following tasks have been defined by this project's Crossbow configuration.
Run any of them in the following way
 
\`\`\`shell
$ crossbow run <taskname>
\`\`\`
|Task name|Description|
|---|---|
|<pre>\`build-css\`</pre>|**Alias for:**<br>- \`css\`<br>- \`version-rev\`|
|<pre>\`version-rev\`</pre>|**Alias for:**<br>- \`@sh versioner | xargs ls\`|
|<pre>\`css\`</pre>|**Alias for:**<br>- \`@npm node-sass\`<br>- \`@npm cssmin\`|
<!--crossbow-docs-end-->`;
        assert.equal(expected, output.markdown);
    });
    it('handles missing file', function () {
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
        assert.equal(output.errors[0].type, DocsErrorTypes.DocsInputFileNotFound);
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
    it('Adds in-between exiting comments', function () {
        const testfile = 'test/fixtures/docs/readme-existing.md';
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
        const expected = before.replace(docs.hasRegExp, output.markdown);

        assert.equal(expected, output.output[0].content);
    });
    it('bails when --output flag given to existing file', function () {
        const output = cli.default({
            input: ['docs'],
            flags: {
                output: 'package.json',
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
        assert.equal(output.errors[0].type, DocsErrorTypes.DocsOutputFileExists);
    });
    it('Creates output for a new file ready to be created', function () {
        const output = cli.default({
            input: ['docs'],
            flags: {
                output: 'name.md',
                handoff: true
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });
        assert.equal(output.errors.length, 0);
        assert.equal(output.output[0].content, output.markdown);
    });
});
