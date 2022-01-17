const path = require('path');
const fs = require('fs');
const ulid = require('ulid');
const sources = path.resolve('config/sources.json');
const profiles = path.resolve('config/profiles.json');
const users = path.resolve('config/users/users.json');

async function sanitize(ressource) {
    try {
        fs.readFile(ressource, (err, data) => {
            const parsedData = JSON.parse(data)
            const sanitizedData =
                Object.entries(parsedData)
                    .map(([key, val]) => addFields(key, val))
                    .reduce((obj, item) => ({ ...obj, [item.id]: item }), {})
            fs.writeFile(ressource, JSON.stringify(sanitizedData, null, 2), (err) => {
                if (err) { console.log(err) }
                console.log('OK:', sanitizedData)
            })
        })
    }
    catch (e) {
        console.log("Err:", e)
    }
}

function addFields(key, val) {
    const id = ulid.ulid();

    return (
        (val.hasOwnProperty("id") ? val : { ...val, id: id })
            .hasOwnProperty("name") ? val : { ...val, name: key }
    )
}

sanitize(sources);
sanitize(profiles);
sanitize(users);