import userManager from "../../../../bin/user.js";
import { profileModel } from "../../../../model/profiles.js";
import { sourceModel } from "../../../../model/sources.js";
import { userDataModel } from "../../../../model/userData.js";
import { userModel } from "../../../../model/users.js";
import { tripleQuotaModel, MAPPING_KIND, UPLOAD_KIND } from "../../../../model/tripleQuota.js";

/**
 * A cap the caller can be shown, next to where they stand against it.
 *
 * `cap` null means nothing limits them, and 0 means the door is closed. Both are
 * carried as they are rather than folded into a boolean, because the screen says
 * different things for "no limit" and "not allowed".
 */
const quotaEntry = (used, cap) => ({ used: used, cap: cap === undefined || cap === null ? null : cap });

export default function () {
    let operations = { GET };

    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const login = userInfo.user.login;

            /* Source creation skips the cap for an admin, in api/v1/paths/sources.js and
             * api/v1/paths/admin/sources.js, so the screen must not show them a cap they
             * will never hit. The other caps do apply to admins, and stay as they are. */
            const isAdmin = await userModel.isAdmin(login);

            const ownedSources = await sourceModel.getOwnedSources(userInfo.user);
            const ownedUserData = await userDataModel.countOwnedBy(parseInt(userInfo.user.id));

            /* Measured live against the triplestore, so a deletion made anywhere, by the
             * tools or by a hand-written SPARQL DELETE, is already reflected here. */
            const mappingTriples = await tripleQuotaModel.usageFor(login, MAPPING_KIND);
            const uploadTriples = await tripleQuotaModel.usageFor(login, UPLOAD_KIND);

            res.status(200).json({
                sources: {
                    ...quotaEntry(Object.keys(ownedSources).length, isAdmin ? null : userInfo.maxNumberCreatedSource),
                    allowed: isAdmin || Boolean(userInfo.allowSourceCreation),
                },
                mappingTriples: quotaEntry(mappingTriples, userInfo.maxWritableTriplesPerUser),
                uploadTriples: quotaEntry(uploadTriples, userInfo.maxUploadTriplesPerUser),
                userDataRecords: quotaEntry(ownedUserData, userInfo.maxUserDataRecordsPerUser),
                /* A ceiling on one export rather than on a stock, so it has no usage to
                 * stand against: shown as information only. */
                exportTriplesPerCall: quotaEntry(null, await profileModel.getMaxNtExportTriplesForUser(userInfo.user)),
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurs on the server" });
        }
    }

    GET.apiDoc = {
        summary: "Where the current user stands against each of their quotas",
        description:
            "Returns, for every limit that has a usage, what the caller currently holds and the cap resolved for them " +
            "(their profiles first, then their account). `cap: null` means no limit, `cap: 0` forbids. " +
            "An admin is never capped on sources, since source creation skips that cap for them. " +
            "The triple figures are measured against the triplestore at call time, so deletions made outside the " +
            "application are already taken into account, which makes this route slower than a plain read.",
        operationId: "getUserQuotas",
        parameters: [],
        responses: {
            200: {
                description: "Usage and cap per quota.",
                schema: {
                    type: "object",
                    properties: {
                        sources: { type: "object", properties: { used: { type: "number" }, cap: { type: "number" }, allowed: { type: "boolean" } } },
                        mappingTriples: { type: "object", properties: { used: { type: "number" }, cap: { type: "number" } } },
                        uploadTriples: { type: "object", properties: { used: { type: "number" }, cap: { type: "number" } } },
                        userDataRecords: { type: "object", properties: { used: { type: "number" }, cap: { type: "number" } } },
                        exportTriplesPerCall: { type: "object", properties: { used: { type: "number" }, cap: { type: "number" } } },
                    },
                },
                examples: {
                    "application/json": {
                        sources: { used: 3, cap: 5, allowed: true },
                        mappingTriples: { used: 12000, cap: 100000 },
                        uploadTriples: { used: 400, cap: 0 },
                        userDataRecords: { used: 12, cap: null },
                        exportTriplesPerCall: { used: null, cap: 5000 },
                    },
                },
            },
            500: { description: "An error occurs on the server" },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Users"],
    };

    return operations;
}
