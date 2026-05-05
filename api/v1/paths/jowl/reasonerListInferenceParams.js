import ConfigManager from "../../../../bin/configManager.js";
import { processResponse } from "../utils.js";
import request from "request";

export default function () {
    let operations = {
        GET,
    };

    function GET(_req, res, _next) {
        var jowlConfig = ConfigManager.config.jowlServer;
        var options = {
            method: "GET",
            headers: {
                "content-type": "application/json",
            },
            url: jowlConfig.url + "reasoner/parametres",
        };
        request(options, function (error, response, body) {
            if (error) return processResponse(res, error, body);
            var json = JSON.parse(body);

            return processResponse(res, error, json);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "List the inference parameters supported by the JOWL reasoner",
        description:
            "Calls `reasoner/parametres` on the JOWL server and returns the JSON describing the available " +
            "inference parameters (used by the UI to render the reasoner configuration form).",
        operationId: "jowlReasonerListInferenceParams",
        parameters: [],
        responses: {
            200: { description: "Inference parameter descriptors.", schema: { type: "object" } },
            500: { description: "JOWL server error." },
        },
        tags: ["JOWL"],
    };

    return operations;
}
