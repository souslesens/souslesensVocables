async function getConfig(): Promise<Config> {

    const response = await fetch('/api/v1/config');
    const json = await response.json();
    return json

}

export type Config = {
    auth: string;
}

export { getConfig }
