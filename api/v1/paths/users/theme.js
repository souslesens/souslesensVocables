import { profileModel } from "../../../../model/profiles.js";
import userManager from "../../../../bin/user.js";

export default function () {
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
        summary: "Get the UI theme attached to the current user's first profile",
        description:
            "Resolves the theme from the caller's first group (`profileModel.getThemeFromProfile`). " + "Used by the frontend on bootstrap to apply the right CSS variant before any other request.",
        operationId: "getUserTheme",
        parameters: [],
        responses: {
            200: {
                description: "Theme name.",
                schema: { properties: { theme: { type: "string" } } },
                examples: { "application/json": { theme: "default" } },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Users"],
    };

    return operations;
}
