import fs from 'fs';
//var reader=require("../SQLutil.js")

var filePath = "D:\\NLP\\ontologies\\OntoGaia\\validationXDB3.csv";
/*csvCrawler.readCsv({ filePath: filePath }, 500000, function (err, result) {
  if (err){

  };
  var data = result.data;
  var relations = result.relations;


  */

fs.readFile(filePath, function (err, data) {
    data = "" + data;

    var lines = data.split("\n");

    var relations = [];

    lines.forEach(function (line, indexLine) {
        var cells = line.split(";");

        cells.forEach(function (header, indexCol) {
            var colName = cells[indexCol - 1];
            if (indexLine == 0) {
                relations.push({ entities: colName, data: [] });
            }
        });
    });

    lines.forEach(function (line, indexLine) {
        var cells = line.split(";");

        if (indexLine > 0) {
            relations.forEach(function (header, indexCol) {
                if (indexCol > 0 && indexCol % 2 == 0) {
                    if (cells[indexCol - 1]) {
                        relations[indexCol].data.push({ label: cells[indexCol - 1], status: cells[indexCol] || "-" });
                    }
                }
            });
        }
    });

    var str = "";
    relations.forEach(function (relation, indexCol) {
        relation.data.forEach(function (item) {
            str += relation.entities + "\t" + item.label + "\t" + item.status.trim() + "\n";
        });
    });

    fs.writeSync(filePath.replace(".", "_transorm."), str);
});
return;
