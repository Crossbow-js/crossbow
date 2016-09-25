const assert = require('chai').assert;
const utils = require("../../utils");
const DocsErrorTypes = require('../../../dist/command.docs').DocsErrorTypes;
const docs = require('../../../dist/command.docs');

describe('Running docs commands', function () {
    it('creates valid markdown', function () {
        const runner = utils.run({
            input: ['docs']
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
        const output = runner.subscription.messages[0].value.value;
        assert.equal(expected, output.markdown);
    });
    it('skips private tasks', function () {
        const runner = utils.run({
            input: ['docs']
        }, {
            tasks: {
                "build-css": ['_css', '_version-rev'],
                '_version-rev': '@sh versioner | xargs ls',
                _css: ['@npm node-sass', '@npm cssmin']
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
|<pre>\`build-css\`</pre>|**Alias for:**<br>- \`_css\`<br>- \`_version-rev\`|
<!--crossbow-docs-end-->`;
        const output = runner.subscription.messages[0].value.value;
        assert.equal(output.markdown, expected);
    });
    it('handles missing file', function () {
        const testfile = 'test/fixtures/docs/readme-typo.md';
        const runner = utils.run({
            input: ['docs'],
            flags: {
                file: testfile
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });
        const output = runner.subscription.messages[0].value.value;
        assert.equal(output.errors.length, 1);
        assert.equal(output.errors[0].type, DocsErrorTypes.DocsInputFileNotFound);
    });
    it('Looks at an existing file', function () {
        const testfile = 'test/fixtures/docs/readme-no-existing.md';
        const runner = utils.run({
            input: ['docs'],
            flags: {
                file: testfile
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });

        const output = runner.subscription.messages[0].value.value;
        const before = require('fs').readFileSync(testfile, 'utf8');

        assert.equal([before, output.markdown].join('\n'), output.output[0].content);
    });
    it('Adds in-between exiting comments', function () {
        const testfile = 'test/fixtures/docs/readme-existing.md';
        const runner = utils.run({
            input: ['docs'],
            flags: {
                file: testfile
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });

        const before = require('fs').readFileSync(testfile, 'utf8');
        const output = runner.subscription.messages[0].value.value;
        const expected = before.replace(docs.hasRegExp, output.markdown);

        assert.equal(expected, output.output[0].content);
    });
    it('bails when --output flag given to existing file', function () {
        const runner = utils.run({
            input: ['docs'],
            flags: {
                output: 'package.json'
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });
        const output = runner.subscription.messages[0].value.value;
        assert.equal(output.errors.length, 1);
        assert.equal(output.errors[0].type, DocsErrorTypes.DocsOutputFileExists);
    });
    it('Creates output for a new file ready to be created', function () {
        const runner = utils.run({
            input: ['docs'],
            flags: {
                output: 'name.md'
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });
        const output = runner.subscription.messages[0].value.value;
        assert.equal(output.errors.length, 0);
        assert.equal(output.output[0].content, output.markdown);
    });
    it('Uses an existing readme.md from a directory when --file && --output missing', function () {
        const runner = utils.run({
            input: ['docs']
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });
        const output = runner.subscription.messages[0].value.value;
        assert.include(output.output[0].content, output.markdown);
    });
    it('Creates a new readme.md file when nothing is found in cwd', function () {
        const runner = utils.run({
            input: ['docs'],
            flags: {
                cwd: 'test'
            }
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });
        const output = runner.subscription.messages[0].value.value;
        assert.equal(output.output[0].content, output.markdown);
    });
});
