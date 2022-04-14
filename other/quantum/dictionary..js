var fs = require("fs");
var async = require("async");
var outputPath = "C:\\Users\\claud\\Downloads\\dictionary2.csv";

var files = [];
for (var i = 0; i < 40; i++) {
    var path = "C:\\Users\\claud\\Downloads\\Query (" + i + ").csv";
    if (fs.existsSync(path)) files.push(path);
}

async.eachSeries(
    files,
    function (filePath, callbackEach) {
        var readStream = fs.createReadStream(filePath);
        var writeStream = fs.createWriteStream(outputPath, { flags: "a" });
        readStream.pipe(writeStream);

        readStream.on("error", function (err) {
            console.log(err);
            writeStream.end();
        });
        readStream.on("end", function (_err) {
            callbackEach();
        });
        writeStream.on("error", function (err) {
            console.log(err);
            writeStream.end();
        });
        writeStream.on("close", function (err) {
            console.log(err);
        });
    },
    function (_err) {
        writeStream.end();
    }
);
