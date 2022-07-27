const request = require("request");
const csv = require("csv-parser");
const fs = require("fs");
const util = require("../../bin/util.");
if (true) {
    var path = "D:\\NLP\\ontologies\\OntoGaia\\export_claude.csv";

    var json = [];
    var parser = csv({
        separator: ",",
    });
    var stream = fs.createReadStream(path);
    stream.pipe(
        parser
            .on("data", (data) => json.push(data))
            .on("end", () => {
                console.log(json.length);
                var indexName = "gaia_onto_v2";
                var bulkStr = "";
                json.forEach(function (item, _indexedLine) {
                    var concepts = JSON.parse(item.Concepts);
                    conceptsArray = [];
                    for (var key in concepts) {
                        var obj = concepts[key];
                        obj.className = key;
                        conceptsArray.push(obj);
                    }
                    item.Concepts = conceptsArray;
                    var id = "R" + util.getRandomHexaId(10);
                    bulkStr += JSON.stringify({ index: { _index: indexName, _type: indexName, _id: id } }) + "\r\n";
                    bulkStr += JSON.stringify(item) + "\r\n";
                });
                ("");

                var elasticUrl = "http://164.132.194.227:2009/";
                const requestOptions = {
                    method: "POST",
                    body: bulkStr,
                    encoding: null,
                    timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
                    headers: {
                        "content-type": "application/json",
                    },
                    url: elasticUrl + "_bulk?refresh=wait_for",
                };
                request(requestOptions, function (error, response, body) {
                    if (error) {
                        return callbackSeries(error);
                    }
                });
            })
    );

    return;
}
