import path from 'path';
import { sourceModel } from '../../../model/sources.js';
import { userModel } from '../../../model/users.js';

import {
    responseSchema,
    successfullyFetched,
    successfullyCreated,
    fixBooleanInObject,
} from './utils.js';

const userManager = require(path.resolve("bin/user.js"));

export default function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/sources
    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            let localSourceModel = sourceModel;

            let userSources;
            if (req.query.ownedOnly) {
                userSources = await localSourceModel.getOwnedSources(userInfo.user);
            } else {
                userSources = await localSourceModel.getUserSources(userInfo.user);
            }

            res.status(200).json(successfullyFetched(userSources));
        } catch (err) {
            res.status(500).json({ message: err });
        }
    }
    GET.apiDoc = {
        summary: "Returns all user accessible sources",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getSources",
        responses: responseSchema("Sources", "GET"),
        parameters: [
            {
                name: "sourcesFile",
                description: "name",
                in: "query",
                type: "string",
                required: false,
            },
        ],
        tags: ["Sources"],
    };
    ///// POST api/v1/sources
    async function POST(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userLogin = userInfo.user.login;
            const isAdmin = await userModel.isAdmin(userLogin);
            if (!isAdmin && !userInfo.allowSourceCreation) {
                res.status(401).json({ message: "Not allowed to create source" });
                return;
            }

            const userOwnedSources = await sourceModel.getOwnedSources(userInfo.user);
            if (!isAdmin && Object.keys(userOwnedSources).length >= userInfo.maxNumberCreatedSource) {
                res.status(401).json({ message: "Cannot create another source, the maximal limit was reached." });
                return;
            }

            let newSource = req.body;

            newSource = fixBooleanInObject(newSource);

            await Promise.all(
                Object.entries(newSource).map(async ([_key, value]) => {
                    // if user is not admin, set owner=me and published=false
                    if (!isAdmin) {
                        value.owner = userLogin;
                        value.published = false;
                    }
                    await sourceModel.addSource(value);
                }),
            );
            const sources = await sourceModel.getAllSources();
            res.status(200).json(successfullyCreated(sources));
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }
    POST.apiDoc = {
        summary: "Update Sources",
        security: [{ restrictLoggedUser: [] }],
        operationId: "updateSources",
        parameters: [],
        responses: responseSchema("Sources", "POST"),
        tags: ["Sources"],
    };

    return operations;
};
