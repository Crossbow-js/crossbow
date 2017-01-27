const assert = require('chai').assert;
const utils = require("../../utils");
const DocsErrorTypes = require('../../../dist/command.docs').DocsErrorTypes;
const docs = require('../../../dist/command.docs');
const fs = require('fs');

describe('Running docs commands', function () {
    it('creates valid markdown', function () {
        const output = utils.getGenericSetup({
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
        assert.equal(expected, output.markdown);
    });
    it('skips private tasks', function () {
        const output = utils.getGenericSetup({
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
        assert.equal(output.markdown, expected);
    });
    it('support parent + child tasks', function () {
        const output = utils.getGenericSetup({
            input: ['docs']
        }, {
            tasks: {
                "js": {
                    description: "My tasks",
                    tasks: function() {}
                },
                "(css)": {
                    build: {
                        description: "My css->build task",
                        tasks: [function() {}]
                    }
                }
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
|<pre>\`js\`</pre>|My tasks|
|<pre>\`css:build\`</pre>|My css->build task|
<!--crossbow-docs-end-->`;
        // console.log(output.markdown);
        assert.equal(output.markdown, expected);
    });
    it('handles missing file', function () {
        const testfile = 'test/fixtures/docs/readme-typo.md';
        const output = utils.getGenericSetup({
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
        assert.equal(output.errors.length, 1);
        assert.equal(output.errors[0].type, DocsErrorTypes.DocsInputFileNotFound);
    });
    it('Looks at an existing file', function () {
        const testfile = 'test/fixtures/docs/readme-no-existing.md';
        const output = utils.getGenericSetup({
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

        assert.equal([before, output.markdown].join('\n'), output.output[0].content);
    });
    it('Adds in-between exiting comments', function () {
        const testfile = 'test/fixtures/docs/readme-existing.md';
        const output = utils.getGenericSetup({
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
        const expected = before.replace(docs.hasRegExp, output.markdown);

        assert.equal(expected, output.output[0].content);
    });
    it('bails when --output flag given to existing file', function () {
        const output = utils.getGenericSetup({
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
        assert.equal(output.errors.length, 1);
        assert.equal(output.errors[0].type, DocsErrorTypes.DocsOutputFileExists);
    });
    it('Creates output for a new file ready to be created', function () {
        const output = utils.getGenericSetup({
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
        assert.equal(output.errors.length, 0);
        assert.equal(output.output[0].content, output.markdown);
    });
    it('Uses an existing readme.md from a directory when --file && --output missing', function () {
        const output = utils.getGenericSetup({
            input: ['docs']
        }, {
            tasks: {
                "build-css": ['css', 'version-rev'],
                'version-rev': '@sh versioner | xargs ls',
                css: ['@npm node-sass', '@npm cssmin']
            }
        });
        assert.include(output.output[0].content, output.markdown);
    });
    it('works with parent groups', function () {
        const output = utils.getGenericSetup({
            input: ['docs'],
            flags: {
                output: 'name.md'
            }
        }, {
            tasks: {
                '(build)': {
                    js: ['@sh rm -rf ./app/js', '@npm webpack'],
                    css: '@npm node-sass app.scss'
                }
            }
        });
        const expected = fs.readFileSync('test/specs/command.docs/with-parent.md', 'utf8');
        assert.equal(output.output[0].content, expected);
    });
});
