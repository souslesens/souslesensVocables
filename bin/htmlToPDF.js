import wkhtmltopdf from "wkhtmltopdf";
import fs from "fs";

var HtmlToPDF = {
    writePdf: function (html, pdfFileName) {
        try {
            wkhtmltopdf(
                html,
                {
                    //  output: pdfPath,
                    noImages: true,
                    disableExternalLinks: false,
                    title: "xxxx",
                    noBackground: false,
                    encoding: "8859-1",
                },
                function (err, stream) {
                    if (err) {
                        console.log(err + "  html " + html);
                        //   return callback(pdfFileName);
                    }

                    stream.pipe(fs.createWriteStream(pdfFileName));
                    //  callback(null, pdfFileName)
                },
            );
        } catch (e) {
            console.log(e);
        }
    },
};
export default HtmlToPDF;
var path = "C:\\Users\\claud\\Downloads\\test.html";
var html = "<html>" + fs.readFileSync(path) + "</html>";

HtmlToPDF.writePdf(html, path.replace(".html", ".pdf"));
