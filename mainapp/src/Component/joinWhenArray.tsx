export function joinWhenArray(allowedSources: string | string[]): string {
    return Array.isArray(allowedSources) ? allowedSources.join(";") : allowedSources;
}
