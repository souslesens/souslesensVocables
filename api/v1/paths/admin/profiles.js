import { profileModel } from '../../../../model/profiles.js';
import { resourceFetched, responseSchema, resourceCreated } from '../utils.js';
import userManager from '../../../../bin/user.js';

module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/profiles
    async function GET(_req, res, _next) {
        try {
            const profiles = await profileModel.getAllProfiles();
            resourceFetched(res, profiles);
        } catch (error) {
            res.status(500).json({ message: error.toString() });
        }
    }
    GET.apiDoc = {
        summary: "Returns all profiles",
        security: [{ restrictAdmin: [] }],
        operationId: "getProfiles",
        responses: responseSchema("Profiles", "GET"),
        tags: ["Profiles"],
    };

    ///// POST api/v1/profiles
    async function POST(req, res, _next) {
        try {
            const newProfile = req.body;
            await Promise.all(
                Object.entries(newProfile).map(async ([_k, profile]) => {
                    await profileModel.addProfile(profile);
                }),
            );
            const profiles = await profileModel.getAllProfiles();
            resourceCreated(res, profiles);
        } catch (error) {
            res.status(403).json({ message: error.toString() });
        }
    }
    POST.apiDoc = {
        summary: "Create a new profile",
        security: [{ restrictAdmin: [] }],
        operationId: "createProfile",
        parameters: [],
        responses: responseSchema("Profiles", "POST"),
        tags: ["Profiles"],
    };

    return operations;
};
