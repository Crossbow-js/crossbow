[![Build Status](https://travis-ci.org/Crossbow-js/crossbow.svg?branch=master)](https://travis-ci.org/Crossbow-js/crossbow)

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
    - build-static
    - htmlmin
  clean: '@shell rm -rf ./public'
  htmlmin: >
    @npm html-minifier
    --input-dir dist
    --output-dir dist
    --collapse-whitespace
```

Both `clean` and `htmlmin` are just scripts, where `build-static` points to a file 
 in the `tasks` directory.
 
**./tasks/build-static.js**
```js
var vfs = require('vinyl-fs');
var cbSites = require('crossbow-sites');

module.exports = function (options) {
    return vfs.src(options.input)
        .pipe(cbSites.stream({
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

# Advanced file-watching system


**short-hand example**
```yaml
watch:
  # default is the name of the watcher group
  default:
    # patterns are colon separated keys
    # tasks are any valid Crossbow tasks
    './scss:_scss': ['sass', 'cssmin']
	'/src/*.hbs': ['@shell rm -rf dist', 'handlebars', 'htmlmin', 'manifest:dev']
```

**long-form example**
```yaml
watch:
  default:
    # you can define watchers like this if 
    # you prefer for readability
    watchers:
	  - patterns: ['./scss']
	    tasks:    ['sass', 'cssmin']
	  - patterns: ['/src/*.hbs']
	    tasks:    ['handlebars', 'htmlmin', 'manifest']

tasks: 
	# Configure tasks as above
```

**short-hand example with options**
```yaml
watch:
  default:
    # `Options` can be set per-watcher.
    # This is especially useful when some types of
    # files need debouncing, but others do not
    options:
      debounce: 2000
      usePolling: true
    # Short-hand syntax is also fine here
    './scss': ['sass', 'cssmin']
	'/src/*.hbs': ['handlebars', 'htmlmin', 'manifest']
```

**short-hand example with options + before tasks**
```yaml
watch:
  default:
    options:
      debounce: 2000
      usePolling: true
    # Giving multiple 'before' tasks will ensure
    # that all are run + completed before any watchers 
    # begin. They can be task names, shell scripts, js files etc
    before:
  	  - '@shell rm -rf dist'
  	  - '@npm browser-sync start -s'
    './scss': ['sass', 'cssmin']
	'/src/*.hbs': ['handlebars', 'htmlmin', 'manifest']
```

<!--crossbow-docs-start-->
## Crossbow tasks

The following tasks have been defined by this project's Crossbow configuration.
Run any of them in the following way
 
```shell
$ crossbow run <taskname>
```
|Task name|Description|
|---|---|
|<pre>`build`</pre>|**Alias for:**<br>- `css`<br>- `js`|
|<pre>`css`</pre>|undefined|
|<pre>`js`</pre>|undefined|
<!--crossbow-docs-end-->

