import path from "path";
import kGcontroller from "../../../../../bin/KG/KGcontroller.js";

// Route /api/v1/kg/assets/:name: not used client-side (no calls found in public/ or mainapp/src/). Likely deprecated.
export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        kGcontroller.getAssetGlobalMappings(req.params.name, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Read the global asset-level mapping for a KG asset",
        description:
            "Returns the asset-level mapping document (`KGcontroller.getAssetGlobalMappings`) used to drive cross-asset " +
            "transformations when several mappings target the same logical asset.",
        operationId: "kgGetAssetMapping",
        parameters: [
            { name: "name", in: "path", type: "string", required: true, description: "Asset mapping name." },
        ],
        responses: {
            200: { description: "Asset mapping document.", schema: { type: "object" } },
            400: { description: "Asset mapping not found or read error." },
        },
        tags: ["KG"],
    };

    return operations;
}
