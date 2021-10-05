

async function getProfiles(url: string): Promise<string[]> {

    const response = await fetch(url);
    const json = await response.json();
    const roles = Object.keys(json);


    return roles
}

export { getProfiles }