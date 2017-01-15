const blacklistedWatcherNames = ["options", "before"];
export function stripBlacklisted (incoming: string[]): string[] {
    return incoming.filter(x => blacklistedWatcherNames.indexOf(x) === -1);
}