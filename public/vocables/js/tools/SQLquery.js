//eslint-disable-next-line @typescript-eslint/no-unused-vars
var SQLquery = (function () {
    var self = {};

    self.onLoaded = function () {
        $("#graphDiv").load("./snippets/SQLquery.html", function () {
            self.initSources();
        });
    };

    self.initSources = function () {
        var adls = [];
        for (var key in Config.sources) {
            var sourceObj = Config.sources[key];
            // eslint-disable-next-line no-console
            if (!sourceObj.schemaType) console.log(key);
            if (sourceObj.schemaType.indexOf("INDIVIDUAL") > -1 && sourceObj.dataSource && sourceObj.dataSource.dbName) {
                adls.push({ id: key, label: key });
            }
        }
        common.fillSelectOptions("SQLquery_SQLsource", adls, true, "label", "id");
    };

    self.execQuery = function () {
        var query = $("#SQLquery_queryTA").val();
        if (query == "") return alert("no query specified");
        var source = $("#SQLquery_SQLsource").val();
        if (source == "") return alert("no source specified");

        const datasource = Config.sources[source].dataSource;

        const params = new URLSearchParams({
            dbName: datasource.dbName,
            type: datasource.type,
            sqlQuery: query,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                (self.sampleData[table] = data), displaySampleData(self.sampleData[table]);
            },

            error: function (_err) {
                // pass
            },
        });
    };

    return self;
})();
