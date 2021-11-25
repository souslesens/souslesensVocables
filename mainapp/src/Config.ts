async function getConfig(): Promise<Config> {

    const response = await fetch('/config');
    const json = await response.json();
    return json

}

export type Config = {
    auth: string;
}

export { getConfig }
