[![Build Status](https://travis-ci.org/Crossbow-js/crossbow-cli.svg?branch=master)](https://travis-ci.org/Crossbow-js/crossbow-cli)

## Crossbow CLI

> Combining the best bits of npm scripts, shell commands, gulp/grunt plugins + more

**Example:**
Crossbow allows mix'n'match of various systems, the following examples show this. In this
 example, we want to wipe a directory, rebuild some HTML and then minify the entire directory

- clean a dir with a shell command
- run a gulp plugin
- run an npm script

**crossbow.yaml**
```yaml
tasks:

  build:
    - clean
    - crossbow
    - htmlmin

  # mix shell commands
  clean: '@shell rm -rf ./public'
  # mix npm scripts (this shows multiline)
  htmlmin: >
    @npm html-minifier
    --input-dir dist
    --output-dir dist
    --collapse-whitespace
```

Both `clean` and `htmlmin` are just scripts, where `crossbow` points to a file 
 in the `tasks` directory.
 
```js
var vfs = require('vinyl-fs');
var crossbow = require('crossbow');

module.exports = function (options) {
    return vfs.src(options.input)
        .pipe(crossbow.stream({
            config: options.config,
            data: options.data
        }))
        .pipe(vfs.dest(options.output));
};

```

** run **
```shell
crossbow run build
```