// Pure helpers for translating between the project root as the LSP server sees it and the
// local workspace root, which differ whenever `maho.phpCommand` runs PHP in another
// filesystem namespace. These operate on URI path strings — always '/'-separated, with a
// leading `/c:` drive segment on Windows — so one set of posix operations covers every host.

export function trimTrailingSlash(uriPath: string): string {
    return uriPath.length > 1 ? uriPath.replace(/\/+$/, '') : uriPath;
}

// Returns undefined for a path outside `fromRoot`, e.g. a container-global include, which
// has no local counterpart.
export function mapPath(
    fromRoot: string,
    toRoot: string,
    uriPath: string,
    ignoreCase = false,
): string | undefined {
    const from = trimTrailingSlash(fromRoot);
    const path = ignoreCase ? uriPath.toLowerCase() : uriPath;
    const prefix = ignoreCase ? from.toLowerCase() : from;

    if (from === '/') {
        return trimTrailingSlash(toRoot) + uriPath;
    }
    if (path !== prefix && !path.startsWith(prefix + '/')) {
        return undefined;
    }
    return trimTrailingSlash(toRoot) + uriPath.slice(from.length);
}

// Recovers the server-side root from a single path when it could not be detected up
// front, by stripping leading segments until the remainder resolves inside the local
// workspace. Longest remainder first, so the shallowest — least ambiguous — match wins.
export function inferRemoteRoot(
    localRoot: string,
    remotePath: string,
    exists: (localUriPath: string) => boolean,
): string | undefined {
    const segments = remotePath.split('/').filter(Boolean);
    const local = trimTrailingSlash(localRoot);

    for (let i = 1; i < segments.length; i++) {
        if (exists(local + '/' + segments.slice(i).join('/'))) {
            return '/' + segments.slice(0, i).join('/');
        }
    }
    return undefined;
}
