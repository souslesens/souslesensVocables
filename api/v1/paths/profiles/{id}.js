const path = require("path");
const fs = require("fs")

module.exports = function () {
    let operations = {
        GET,
        DELETE
    };

    function GET(req, res, next) {
        fs.readFile(path.resolve('config/profiles.json'), 'utf8', (err, data) => {
            if (err) {
                res.status(500).json({ message: "I couldn't read profiles.json" })
            } else {
                const profiles = JSON.parse(data);
                const profile = profiles[req.params.id]
                req.params.id ?
                    profile ? res.status(200).json(profiles[req.params.id])
                        : res.status(400).json({ message: `Profile with id ${req.params.id} not found` })

                    :
                    res.status(200).json(profiles)


            }
        });
    }

    function DELETE(req, res, next) {
        fs.readFile(path.resolve('config/profiles.json'), 'utf8', (err, data) => {
            if (err) {
                res.status(500).json({ message: "I couldn't read profiles.json" })
            } else {
                if (req.params.id) {
                    const oldProfiles = JSON.parse(data);
                    const idProfileToDelete = req.params.id
                    const { [req.params.id]: id, ...newProfiles } = oldProfiles
                    const deletionFailed = JSON.stringify(newProfiles) === JSON.stringify(oldProfiles)
                    deletionFailed ? res.status(400).json({ message: `I could not delete ressource ${req.params.id}, maybe the ressource has already been deleted. Or check the id.` }) :
                        res.status(200).json({
                            message: `${req.params.id} has been deleted`
                            , profiles: newProfiles
                        })

                } else {

                    res.status(500).json({ message: 'You must provide the id' })
                }


            }
        });
    }
    GET.apiDoc = {
        summary: 'This ressource returns profiles list or a profile if an id is provided',
        operationId: 'getProfiles',
        parameters: [
        ],
        responses: {
            200: {
                description: 'Profiles',
                schema: {
                    $ref: '#/definitions/GetProfiles'
                }
            },
        }
    };

    return operations;
}