import DirContentAnnotator from '../../../../bin/annotator/dirContentAnnotator.js';
import { processResponse } from '../utils.js';

module.exports = function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        try {
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).send("No files were uploaded.");
            }
            console.log("Hey 'im before 2nd if");
            if (req.files.EvaluateToolZipFile) {
                const zipFile = req.files.EvaluateToolZipFile;
                console.log("myBody", req.body);
                DirContentAnnotator.uploadAndAnnotateCorpus(zipFile, req.body.corpusName, JSON.parse(req.body.sources), JSON.parse(req.body.options), function (err, result) {
                    processResponse(res, err, result);
                });
            }
        } catch (e) {
            res.status(e.status || 500).json(e);
            next(e);
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Let users upload a zip File",
        description: "Let users upload a zip File",
        operationId: "uploadZipFile",
        // It's a multipart/form-data because there is a zip file in the form data
        consumes: ["multipart/form-data"],
        parameters: [
            { in: "formData", required: true, name: "EvaluateToolZipFile", type: "file", description: "The file to upload" },
            { in: "formData", required: true, name: "sources", type: "string", description: "Sources as JSON" },
            { in: "formData", required: true, name: "corpusName", type: "string", description: "Corpus' name" },
            { in: "formData", required: true, name: "options", type: "string", description: "Additional options as JSON" },
        ],
        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
        tags: ["Annotate"],
    };

    return operations;
};
