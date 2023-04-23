const HttpProxy = require("../../../../bin/httpProxy.");
const ConfigManager = require("../../../../bin/configManager.");
const async=require("async");
const { processResponse } = require("../utils");
module.exports = function() {
  let operations = {
    GET
  };

  function GET(req, res, next) {
    let options = null;
    if (req.query.options) {
      options = JSON.parse(req.query.options);
    }

    var url=null;
    var result=null
    async.series([

      function(callbackSeries){
      if(req.query.type=="url"){
return callbackSeries()
      }
       else if(req.query.type=="SLSVsource"){

        }
       else{
        return res.status(400).json({ error: "type not supported" });
      }

      },
      function(callbackSeries){

      }





    ],function(err){
      return processResponse(res, parsingError, result);

    })

      var jowlConfig=ConfigManager.config.jowlServer
if(req.query.type=url)

    var url=
      jowlConfig.url+"reasoner/"+operation+"?filePath="+url+"&operation=computeinference"


      HttpProxy.get(jowlConfig.url,null,function(err, response) {
      if (err) {
        next(err);
      }
      else {
        return res.status(200).json(result);
      }
    });
  }

  GET.apiDoc = {
    security: [{ loginScheme: [] }],
    summary: "Query Jowl server",
    description: "Query Jowl server",
    operationId: "Query Jowl server",
    parameters: [
      {
        name: "operation",
        description: "operation",
        type: "string",
        in: "query",
        required: true
      },
      {
        name: "type",
        description: "type  sourceName or url",
        in: "query",
        type: "string",
        required: true
      },
      {
        name: "name",
        description: "source name or url",
        in: "query",
        type: "string",
        required: true
      },
      {
        name: "options",
        description: "JSON ",
        in: "query",
        type: "string",
        required: false
      }
    ],

    responses: {
      200: {
        description: "Results",
        schema: {
          type: "object"
        }
      }
    }
  };

  return operations;
};
