import { profileModel } from '../../../../model/profiles';
import userManager from '../../../../bin/user.js';

module.exports = function () {
    let operations = { GET };

    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const firstGroup = userInfo.user.groups[0];

            const theme = await profileModel.getThemeFromProfile(firstGroup);
            res.status(200).json({ theme: theme });
        } catch (error) {
            console.error(error);
            next();
        }
    }

    GET.apiDoc = {
        description: "Retrieve the theme from the profile of the current logged user",
        parameters: [],
        responses: {
            200: {
                description: "Theme’s name",
                schema: {
                    type: "string",
                },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        summary: "Get the logged user profile theme",
        tags: ["Users"],
    };

    return operations;
};
