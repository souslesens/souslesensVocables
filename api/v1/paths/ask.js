
import { mainConfigModel } from "../../../model/mainConfig.js";
import logger from "../../../bin/logger.js";
import Ask from "../../../bin/ask.js";


export default function () {
    let operations = {
        GET,
    };

    ///// GET api/v1/logs
    async function GET(req, res, _next) {

        var requestName=req.body.requestName
        if(requestName=="whoAmI"){
            Ask.whoAmI(req.body.source, req.body.term1,function (err, result){
                if(err){
                    return res.status(404).json(err);
                }
                return res.status(200).json({ message: result, status: 200 });
            })
        }
        else if(requestName=="getKnowledgeModelGraph"){
            Ask.getKnowledgeModelGraph(req.body.source,function (err, result){
                if(err){
                    return res.status(404).json(err);
                }
                return res.status(200).json({ message: result, status: 200 });
            })
        }
        else if(requestName=="getTwoTermsShortestPath"){
            Ask.getTwoTermsShortestPath(req.body.source,req.body.term1,req.body.term2,function (err, result){
                if(err){
                    return res.status(404).json(err);
                }
                return res.status(200).json({ message: result, status: 200 });
            })
        }
        else if(requestName=="getLinkedClasses"){
            Ask.getLinkedClasses(req.body.source,req.body.term1,req.body.term2,function (err, result){
            if(err){
                return res.status(404).json(err);
            }
            return res.status(200).json({ message: result, status: 200 });
        })
        }

    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Ask ",
        description:
            "...",
        operationId: "Ask",
        parameters: [

            { name: "requestName", in: "query", type: "string", required: false, description: "..." },
            { name: "source", in: "query", type: "string", required: false, description: "..." },
            { name: "term1", in: "query", type: "string", required: false, description: "..." },
            { name: "term1", in: "query", type: "string", required: false, description: "..." },
        ],

        responses: {
            200: {
                description: "...",
                schema: {
                    type: "object",
                   // items: { type: "string" },
                  //  example: ["iof_core", "gemet", "ecosystem-ontology"],
                },
            },
            500: {
                description: "Elasticsearch unreachable or returned an error.",
                schema: {
                    type: "object",
                  //  properties: { error: { type: "object" } },
                },
            },
        },
        tags: ["Ask"],
    };



    return operations;
}
