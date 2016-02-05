export default function run (tasks: string[]) : string {
    return tasks.map(x => x.trim()).join('\n');
}
