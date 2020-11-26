/**
 * Created by claud on 09/05/2017.
 */
var fs = require('fs');
var httpProxy = require('../../httpProxy.')
var async = require('async')
var AAPG = {

    getLinks: function () {
        var path = "D:\\Total\\2020\\Stephanie\\AAPG-Pages.txt";

        var data = "" + fs.readFileSync(path)
        var pages = data.split("\n");
        var pageIndex = 0

        var links = {};
        async.eachSeries(pages, function (page, callbackEach) {
            page=encodeURIComponent(page)
            if (!links[page])
                links[page] = [];


                var url = "https://wiki.aapg.org/index.php?title=Special%3AWhatLinksHere&format=json&target=" + page;


              setTimeout(function() {
                    httpProxy.get(url, {}, function (err, result) {

                        if (err)
                            return callbackEach(err)
                        var text = result;
                        console.log(page);
                        var regex = /<li><a href="\/([^".]*)" title/g

                        let array;

                        while ((array = regex.exec(text)) !== null) {

                            links[page].push(array[1])
                        }
                        if((pageIndex++)%20==0)
                            fs.writeFileSync( "D:\\Total\\2020\\Stephanie\\AAPG-links.json",JSON.stringify(links));

                        callbackEach()
                    })
              },10)




        },function(err) {
            if (err)
                return console.log(err);
            var xx=links;

            fs.writeFileSync( "D:\\Total\\2020\\Stephanie\\AAPG-links.json",JSON.stringify(links));
            })



    },

    linksToRdf:function(){
var json=  JSON.parse(""+ fs.readFileSync( "D:\\Total\\2020\\Stephanie\\AAPG-links.json"));
var rdf=""
        for(var key in json) {
            json[key].forEach(function (item) {
                key=key.replace(/%20/g,"_")
                rdf += "<https://wiki.aapg.org/" + key +"> <http://www.w3.org/2000/01/rdf-schema#seeAlso> "+"<https://wiki.aapg.org/" + item+">.\n"

            })
        }

        fs.writeFileSync( "D:\\Total\\2020\\Stephanie\\AAPG-rdf.ttl",rdf);
    }


}

module.exports = AAPG

//AAPG.getLinks()
AAPG.linksToRdf()
