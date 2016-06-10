const docStart = '<\!--crossbow-docs-start-->';
const docEnd   = '<\!--crossbow-docs-end-->';

const reg = new RegExp('<\!--crossbow-docs-start-->([\s\S]+?)<\!--crossbow-docs-end-->', 'g');

const str = `<!--cb-docs-start--><!--cb-docs-end-->`;

console.log(/<!--cb-docs-start-->([\s\S]+?)?<!--cb-docs-end-->/g.test(str));

console.log(new RegExp(`<!--cb-docs-start-->([\s\S]+?)?<!--cb-docs-end-->`, 'g').test(str));
