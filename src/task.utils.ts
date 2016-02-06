import {resolve} from 'path';
import {existsSync} from 'fs';

export function locateModule (cwd: string, name: string): string[] {
    if (name.indexOf(':') > -1) {
        name = name.split(':')[0];
    }
    return [
        ['tasks', name + '.js'],
        ['tasks', name],
        [name + '.js'],
        [name],
        ['node_modules', 'crossbow-' + name]
    ]
        .map(x => resolve.apply(null, [cwd].concat(x)))
        .filter(existsSync);
}
