const assert = require('chai').assert;
const Rx = require('rx');
const cli = require("../dist/index");
const errorTypes = require('../dist/task.errors').TaskErrorTypes;
const RunCommandReportTypes = require('../dist/command.run').RunCommandReportTypes;

describe('Running docs commands', function () {
    it.only('reports when a task is completed', function () {
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
        const expected = `|Name|Description|
|---|---|
|**\`build-css\`**|**Alias for**<br>- \`css\`<br>- \`version-rev\`|
|**\`version-rev\`**|**Alias for**<br>- \`@sh versioner | xargs ls\`|
|**\`css\`**|**Alias for**<br>- \`@npm node-sass\`<br>- \`@npm cssmin\`|`;
        assert.equal(expected, output.markdown);
    });
});
