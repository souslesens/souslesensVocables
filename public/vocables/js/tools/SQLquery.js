
var SQLquery=(function(){

    var self={}

    self.onLoaded = function () {
        $("#graphDiv").load("./snippets/SQLquery.html");

        setTimeout(function () {

            self.initSources();
        }, 500)
    }


    self.initSources = function () {
        var adls = []
        for (var key in Config.sources) {
            var sourceObj = Config.sources[key];
            if (!sourceObj.schemaType)
                console.log(key)
            if (sourceObj.schemaType.indexOf("INDIVIDUAL") > -1 && sourceObj.dataSource && sourceObj.dataSource.dbName) {
                adls.push({id: key, label: key})
            }
        }
        common.fillSelectOptions("SQLquery_SQLsource", adls, true, "label", "id")

    }

    self.execQuery=function(){

        var query=$("#SQLquery_queryTA").val();
        if(query=="")
            return alert ("no query specified")
        var source=$("#SQLquery_SQLsource").val()
        if(source=="")
            return alert ("no source specified")


        self.currentKGdataSource=Config.sources[source].dataSource
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: {
                KGquery: 1,
                getData: 1,
                dataSource: JSON.stringify(self.currentKGdataSource),
                sqlQuery: query
            },
            dataType: "json",

            success: function (data, textStatus, jqXHR) {

                self.sampleData[table] = data,
                    displaySampleData(self.sampleData[table])

            }

            , error: function (err) {


            }
        })


    }






    return self;


})()