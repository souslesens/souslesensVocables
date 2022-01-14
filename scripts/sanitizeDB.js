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
                    .map(([key, val]) => addFields(val))
                    .reduce((obj, item) => ({ ...obj, [item.id]: item }), {})
            fs.writeFile(ressource, JSON.stringify(sanitizedData), (err) => {
                if (err) { console.log(err) }
                console.log('OK:', sanitizedData)
            })
        })
    }
    catch (e) {
        console.log("Err:", e)
    }
}

function addFields(val) {
    const id = ulid.ulid();

    return ((val.hasOwnProperty(id) ? val : { ...val, id: id }))

}

sanitize(sources);
sanitize(profiles);
sanitize(users);