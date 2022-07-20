
const { Client } = require("@elastic/elasticsearch");

executeGaiaQuery=function(query, indexes, options, callback) {
  const client = new Client({
    cloud: { id: "SSE_Sandbox:ZXVyb3BlLXdlc3QxLmdjcC5jbG91ZC5lcy5pbzo0NDMkNTNjOTRlY2NlMGRkNDcyNDg1ZmU3MjE5N2Y2YTRjNzQkYTViOGIyNGZlOTA0NDI1YmJjMTVlZTAxZTBkY2E1YjE=" },
    auth: {
      username: "elastic",
      password: "iusGlDD0NMdfUsu0dLclh9hx"
    }
  });




  if (Array.isArray(indexes))
    indexes = indexes.toString();
  var size = 10000;
  if (query.aggs)
    size = 0;
  client.search({
    size: size,
    index: indexes,
    body: query
  }).then(function(res) {
    callback(null, res);
  }, function(err) {
    callback(err);
  });
  return;

  const query_doc = async function() {
    var searchResult = {};
    try {
      searchResult = await client.search({
        index: indexes,
        size: 2000,
        query: query
      });
    } catch (e) {
      callback(e);
    }
    callback(null, searchResult);
  };
  query_doc();
}

if (true) {
  var indexes = "gaia_onto_v2";
  var query = {
    match: { "DocId": "DOC00000000000000001037" }
  };
  var query =
    {
      "aggs": {
        "Basin": {
          "terms": { "field": "Concepts.Basin.instances.keyword", "size": 1000, "min_doc_count": 2 }

        },

        "Fluid": {
          "terms": { "field": "Concepts.Fluid.instances.keyword", "size": 1000, "min_doc_count": 2 }

        }


      }
    };
  var query={
    "query": {
      "bool": {
        "must": [
          {
            "terms": {
              "Concepts.Basin.instances.keyword": [
                "Amadeus Basin",
                "Amadeus Basins"
              ]
            }
          }
        ],
        "should":[ {
          "terms": {
            "Concepts.Fluid.instances.keyword": [
              "Fluid Oil",
              "Fluid Water"
            ]
          }
        },

        ],
        "minimum_should_match": 1,
        "boost": 1
      }
    }
  }
  var query=
    {
      "query": {
        "bool": {
          "must": [
            {
              "term": {
                "Concepts.Log.name.keyword": [
                  "Adavale Basin",
                  "Adriatic Basin",
                  "African basins"
                ]
              }
            }
          ]

        }
      }
    }

  executeGaiaQuery(query, indexes, {}, function(err, result) {
    result.hits.hits.forEach(function(hit){
      if(!hit._source.Concepts.Fluid)
        var x=3
    })
    if (err)
      console.log(err);
  });
}
