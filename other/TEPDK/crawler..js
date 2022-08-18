const async = require("async");

const fs = require("fs");
const csv = require("csv-parser");
const util = require("../../bin/util.");
const { Transform } = require("stream");

var crawler = {
    readCsv: function (filePath, separator, lines, processor, callback) {
        if (!fs.existsSync(filePath)) return callback("file does not exists :" + filePath);
        var headers = [];
        var jsonData = [];
        var jsonDataFetch = [];

        fs.createReadStream(filePath, { encoding: "utf8" }).pipe(
            csv({
                separator: separator,
                mapHeaders: ({ header }) => util.normalizeHeader(headers, header),
            })
                .on("header", function (header) {
                    headers.push(header);
                })

                .on("data", function (data) {
                    var emptyLine = true;
                    for (var i = 0; i < headers.length; i++) {
                        if (data[headers[i]]) {
                            emptyLine = false;
                            break;
                        }
                    }
                    if (emptyLine) return;

                    jsonDataFetch.push(data);

                    if (lines && jsonDataFetch.length >= lines) {
                        if (processor) {
                            processor(jsonDataFetch, headers, filePath, function (err) {});

                        }else{
                            jsonData.push(jsonDataFetch);
                        }


                        jsonDataFetch = [];
                    }
                })
                .on("end", function () {
                    jsonData.push(jsonDataFetch);
                    return callback(null, { headers: headers, data: jsonData });
                })
                .on("error", function (error) {
                    return callback(error);
                })
        );
    },
};
module.exports = crawler;

function convertSep(filePath, fromsep, tosep, targetPath) {
    var c = String.fromCharCode(65533);
    var regex = new RegExp(c, "g");

    var index = 0;
    var rs = fs.createReadStream(filePath);
    var ws = fs.createWriteStream(targetPath, "UTF8");
    var Transform = require("stream").Transform;
    var transformer = new Transform();
    const replace = require("buffer-replace");
    transformer._transform = function (data, encoding, cb) {
        var c = String.fromCharCode(65533);
        // data2=  replace(data, c, tosep)
        //  return    cb(null,data2);

        var str = "" + data;

        var str2 = str.replace(regex, "\t");
        var data2 = Buffer.from(str2);
        if (index++ == 0) fs.writeFileSync(filePath + "extract.txt", str2);

        cb(null, data2);
    };

    rs.pipe(transformer).pipe(ws);
}

var dir = "D:\\NLP\\ontologies\\TEPDK2\\OMS\\Final Extract\\";

var file = "floc_mou_structures_01052021.txt";
var file = "floc_omobjc_01052021.txt";
var file = "Mou_char_values_all_01052021.txt";
var file = "Mou_functional_locations_all_01052021.txt";
/*convertSep(dir+file,'¤',",",dir+file+"_sep")
return;*/

if (false) {
    var file = "Mou_char_values_all_01052021.txt";
    var distinctMou_char_values = {};
    var str = "OBJ_CLASS\tCHR_CHAR";
    var Mou_char_values_processor = function (lines, headers, filePath) {
        lines.forEach(function (item) {
            var key = item.OBJ_CLASS + "\t" + item.CHR_CHAR;
            if (!distinctMou_char_values[key]) distinctMou_char_values[key] = 1;
            str += key + "\n";
        });
        console.log(Object.keys(distinctMou_char_values).length);
    };
    crawler.readCsv(dir + file + "_sep", "\t", 1000, Mou_char_values_processor, function (err, result) {
        var outputFile = "D:\\NLP\\ontologies\\TEPDK2\\OMS\\Final Extract\\Mou_char_values_distinct.txt";
        fs.writeFileSync(outputFile, str);
    });
}

if (false) {
    function splitPhusionCodeLabel(filePath, targetPath) {
        var rs = fs.createReadStream(filePath);
        var ws = fs.createWriteStream(targetPath, "UTF8");
        var Transform = require("stream").Transform;
        var transformer = new Transform();
        const replace = require("buffer-replace");
        transformer._transform = function (data, encoding, cb) {
            var str = "" + data;
            var str2 = str.replace(/ \| /g, ",");
            var data2 = Buffer.from(str2);

            cb(null, data2);
        };

        rs.pipe(transformer).pipe(ws);
    }
    var dir = "D:\\NLP\\ontologies\\TEPDK2\\OnePulse\\";
    var file = "TEPDK_ADL_tblTag.csv";
    var file = "TEPDK_ADL_tblTagAttribute.csv";
    var filePath = dir + file;
    var targetPath = dir + file.replace(".", "_x.");
    splitPhusionCodeLabel(filePath, targetPath);
}


if(false){

    if(true){

        var dir="D:\\NLP\\ontologies\\TEPDK2\\OnePulse\\"
var file="physicalClassesHierarchy.csv"
        crawler.readCsv(dir + file,";", 10000, null, function (err, result) {
            var data=result.data[0]
            var str=""
            data.forEach(function(item){
                for(var i=1;i<7;i++){


                    if(item["ID_level_"+i]){
                        if(i==6)
                            var cc=3
                        var x=item["ID_level_"+i]
                        if(item["ID_level_"+i].indexOf("727")>-1)
                            var x=3
                     str+=item["ID_level_"+i].replace("http://data.total.com/resource/tsf/ontology/data-domains/facility-design/phusion/","")  +"\t"+
                       item["Label_level_"+i]+"\t"+
                         i+"\n"
                    }
                }



            })
            fs.writeFileSync(dir + file.replace(".csv","levels.csv") ,str);
        })

    }
}

if(true){
    var dir="D:\\NLP\\ontologies\\TEPDK2\\slsv\\"


    var str=""
    var files=fs.readdirSync(dir)
    files.forEach(function(file){
        var fileStr=""+fs.readFileSync(dir+file)
        str+=fileStr+"\n";
    })
    fs.writeFileSync(dir+"allClassesAllAttrs",str)


}