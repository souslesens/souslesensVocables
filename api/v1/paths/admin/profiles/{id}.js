const { profileModel } = require("../../../../../model/profiles");
const userManager = require("../../../../../bin/user.");

module.exports = function () {
    let operations = {
        GET,
        DELETE,
        PUT,
    };

    async function GET(req, res, _next) {
        const userInfo = await userManager.getUser(req.user);
        const profile = await profileModel.getOneUserProfile(userInfo.user, req.params.id);
        if (profile) {
            res.status(200).json(profile);
            return;
        }
        res.status(400).json({ message: `Profile with id ${req.params.id} not found` });
    }

    async function DELETE(req, res, next) {
        if (!req.params.id) {
            res.status(500).json({ message: "I need a resource ID to perform this request" });
            return;
        }
        try {
            const profileIdToDelete = req.params.id;
            const profileExists = await profileModel.deleteProfile(profileIdToDelete);
            if (!profileExists) {
                res.status(500).json({ message: `I couldn't delete resource ${profileIdToDelete}. Maybe it has been deleted already?` });
                return;
            }
            const profiles = await profileModel.getAllProfiles();
            res.status(200).json({ message: `${profileIdToDelete} successfully deleted`, resources: profiles });
        } catch (err) {
            next(err);
        }
    }

    async function PUT(req, res, next) {
        const updatedProfile = req.body;
        const profileIdToUpdate = req.params.id;
        if (profileIdToUpdate != updatedProfile.name) {
            res.status(500).json({ message: "Id and name are different." });
            return;
        }
        try {
            const profileExists = await profileModel.updateProfile(updatedProfile);
            if (!profileExists) {
                res.status(400).json({ message: "Resource does not exist. If you want to create another reprofile, use POST instead." });
                return;
            }
            const profiles = await profileModel.getAllProfiles();
            res.status(200).json({ message: `${profileIdToUpdate} successfully updated`, reprofiles: profiles });
        } catch (err) {
            next(err);
        }
    }

    GET.apiDoc = {
        summary: "Get a specific profile",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getOneProfile",
        parameters: [],
        responses: {
            200: {
                description: "Profiles",
                schema: {
                    $ref: "#/definitions/Profile",
                },
            },
        },
    };
    DELETE.apiDoc = {
        summary: "Delete a specific profile",
        security: [{ restrictAdmin: [] }],
        operationId: "DeleteOneProfile",
        parameters: [],
        responses: {
            200: {
                description: "Profiles",
                schema: {
                    $ref: "#/definitions/Profile",
                },
            },
        },
    };
    PUT.apiDoc = {
        summary: "Update Profile",
        security: [{ restrictAdmin: [] }],
        operationId: "updateProfiles",
        parameters: [],
        responses: {
            200: {
                description: "Profile",
                schema: {
                    $ref: "#/definitions/Profile",
                },
            },
        },
    };

    return operations;
};
