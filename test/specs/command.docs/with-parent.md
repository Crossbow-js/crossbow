<!--crossbow-docs-start-->
## Crossbow tasks

The following tasks have been defined by this project's Crossbow configuration.
Run any of them in the following way
 
```shell
$ crossbow run <taskname>
```
|Task name|Description|
|---|---|
|<pre>`build:js`</pre>|**Alias for:**<br>- `@sh rm -rf ./app/js`<br>- `@npm webpack`|
|<pre>`build:css`</pre>|**Alias for:**<br>- `@npm node-sass app.scss`|
<!--crossbow-docs-end-->