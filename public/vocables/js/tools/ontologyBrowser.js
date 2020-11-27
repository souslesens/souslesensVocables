var OntologyBrowser = (function () {
    var self = {}

    self.schemasConfig
    self.currentSourceSchema
    self.currentSourceUri
    self.nodeProperties;
    self.currentFilters = {}
    self.currentSelectedProps = {}

    var dataTypes = {
        "http://www.w3.org/2001/XMLSchema#decimal": "number",
        "http://www.w3.org/2001/XMLSchema#string": "string",
        "http://www.w3.org/2001/XMLSchema#dateTime": "date"
    }
    var operators = {
        number: ["=", ">", "<", "!=", ">=", "<="],
        date: ["=", ">", "<", "!=", ">=", "<="],
        string: ["=", "!=", "startWith", "contains"]
    }

    self.onSourceSelect = function (sourceLabel) {
          MainController.currentSource = sourceLabel;
        self.currentSourceUri = Config.sources[sourceLabel].graphUri
        if (Config.sources[sourceLabel].sourceSchema) {
            //  if(! self.schemasConfig) {
            $.getJSON("config/schemas.json", function (json) {
                self.schemasConfig = json;
                self.currentSourceSchema = self.schemasConfig[Config.sources[sourceLabel].sourceSchema]
                ThesaurusBrowser.showThesaurusTopConcepts(sourceLabel, {treeSelectNodeFn: OntologyBrowser.onNodeSelect, contextMenu: {}})
                $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> <button onclick='ThesaurusBrowser.searchTerm()'>Search</button>")
                $("#graphDiv").load("snippets/ontologyBrowser.html")
                setTimeout(function () {
                    $("#OntologyBrowser_tabs").tabs()
                }, 200)


            })
        } else
            return MainController.UI.message("no Schema for source " + sourceLabel)

    }

    self.onNodeSelect = function (event, obj) {


        Sparql_schema.getObjectDomainProperties(self.currentSourceSchema, obj.node.id, function (err, result) {
            var nodeProperties = [];
            result.forEach(function (item) {
                nodeProperties.push({id: item.domain.value, label: common.getItemLabel(item, "domain")})
            })
             Sparql_schema.getObjectRangeProperties(self.currentSourceSchema,obj.node.id,function(err,result){

                 result.forEach(function(item){
                     nodeProperties.push({id: item.range.value, label: common.getItemLabel(item, "range")})
                 })


             })
            common.fillSelectOptions("OntologyBrowser_filter_ObjectpropertiesSelect", nodeProperties, true, "label", "id")
            $("#OntologyBrowser_tabs").tabs( "option", "active", 0 );
            self.showDatatypeProperties(obj.node.id);

        })


    }


    self.showDatatypeProperties = function (classId) {
        self.currentClass = classId;
        Sparql_schema.getDataTypeProperties(self.currentSourceSchema, classId, function (err, result) {
            self.nodeProperties = {};
            result.forEach(function (item) {
                var propLabel = common.getItemLabel(item, "property")
                if( self.nodeProperties[propLabel])
                    return;
                var range = "";
                if (item.range )
                    range = item.range.value
                else //?? correct ?????
                    range= "http://www.w3.org/2001/XMLSchema#string"
                self.nodeProperties[propLabel] = {id: item.property.value, label: propLabel, range: range}
            })
            var html = "<table border='1px'><tr><tr><td>property</td><td>all<input type='checkbox' class='OntologyBrowser_propCBX'  value='ALL'> </td></tr>"
            for (var key in self.nodeProperties) {

                html += "<tr><td>" + key + "</td>" +
                    "<td><input type='checkbox' class='OntologyBrowser_propCBX'  value='" + key + "'></td>" +

                    "</tr>"
            }
            html += "</table>"
            $("#OntologyBrowser_PropertiesDiv").html(html);
            $(".OntologyBrowser_propCBX").bind("change", function () {
                var add = $(this).prop("checked")
                OntologyBrowser.onDataPropertySelect($(this).val(), add)

            })
            common.fillSelectOptions("OntologyBrowser_filter_DataPropertiesSelect", self.nodeProperties, true, "label", "id")

        })
    }

    self.onDataPropertySelect = function (propLabel, add) {
        if (add) {
            if(propLabel=="ALL"){
                return $(".OntologyBrowser_propCBX").prop( "checked", true )
            }


            $("#OntologyBrowser_PropertiesFilterInputDiv").css("display", "block")
            $("#OntologyBrowser_filter_DataPropertiesSelect").val(propLabel)

            var range = self.nodeProperties[propLabel].range

            if (dataTypes[range]) {
                common.fillSelectOptions("OntologyBrowser_filter_operators", operators[dataTypes[range]], false)

            }
            var classLabel = common.getUriLabel(self.currentClass)
            if (!self.currentSelectedProps[classLabel])
                self.currentSelectedProps[classLabel] ={classId: self.currentClass, properties: []};
            if (self.currentSelectedProps[classLabel].properties.indexOf(propLabel) < 0)
                self.currentSelectedProps[classLabel].properties.push(propLabel)


        } else {
            if(propLabel=="ALL"){
                return $(".OntologyBrowser_propCBX").prop( "checked", false )
            }
            $("#OntologyBrowser_PropertiesFilterInputDiv").css("display", "none")
            //$("#OntologyBrowser_filter_DataPropertiesSelect").val("")
            var classLabel = common.getUriLabel(self.currentClass)
            var index = self.currentSelectedProps[classLabel].properties.indexOf(propLabel);
            self.currentSelectedProps[classLabel].properties.splice(index, 1)
        }

    }

    self.addFilter = function () {
        var propertyLabel = $("#OntologyBrowser_filter_DataPropertiesSelect").val();
        var operator = $("#OntologyBrowser_filter_operators").val();
        var value = $("#OntologyBrowser_filter_value").val();

        var range = self.nodeProperties[propertyLabel].range
        var propertyId = self.nodeProperties[propertyLabel].id

        var classLabel = common.getUriLabel(self.currentClass)
        if (!self.currentFilters[classLabel])
            self.currentFilters[classLabel] = {classId: self.currentClass, filters: []}
        self.currentFilters[classLabel].filters.push({
            propertyLabel: propertyLabel,
            propertyId: propertyId,
            operator: operator,
            value: value,
            range: range
        })
        var filterId = classLabel + "__" + (self.currentFilters[classLabel].length - 1)

        var html = "<div id='" + filterId + "' class='OntologyBrowser_minorDiv'>" +
            common.getUriLabel(propertyLabel) +
            operator +
            value +
            "<button onclick='OntologyBrowser.removeFilter(\"" + filterId + "\")'>-</button>" +
            "</div>"

        $("#OntologyBrowser_filtersContainerDiv").append(html)

    }

    self.removeFilter = function (filterId) {
        var array = filterId.split("__")
        var classId = array[0]
        var filterIndex = parseInt(array[1])
        self.currentFilters[classId].filters.splice(filterIndex, 1)
        $("#" + filterId).remove()

    }


    self.executeFilterQuery = function () {


        function getPropertyFilter(item, propertyLabel) {
            if (item.operator == "contains")
                return "regex(" + propertyLabel + ",'" + item.value + "','i')"

            var strPredObj = ""
            if (item.range) {
                var type = dataTypes[item.range]
                if (type == "number" || type == "date") {
                    strPredObj = item.operator + "'" + item.value + "^^" + item.range + "'"
                }
                if (type == "string") {
                    var langStr = ""
                    if (item.lang)
                        langStr = "@" + item.lang
                    strPredObj = item.operator + "'" + item.value + "'" + langStr;
                }
                strPredObj = item.operator + item.value;
                return propertyLabel + " " + strPredObj;
            } else
            // if(type=="uri"){
                return propertyLabel + "= <" + item.value + ">"
        }

        var propIndex = 0
        var query = ""
        var queryWhere = "";
        var querySelectProps = "";
        var selectProps="";


        for (var key in self.currentSelectedProps) {
            var className = key
            var classId = self.currentSelectedProps[key].classId;
            self.currentSelectedProps[key].properties.forEach(function (item) {
                var propId = self.nodeProperties[item].id
                querySelectProps += "OPTIONAL {?" + className + " <" + propId + "> ?" + item + ".} ";
                selectProps += "?" + item + " ";
            })
        }




        for (var key in self.currentFilters) {
            var className = key
            var classId = self.currentFilters[key].classId;


            queryWhere += "?" + className + " rdf:type <" + classId + ">."
            self.currentFilters[key].filters.forEach(function (item) {
                var propertyLabel = "?" + item.propertyLabel + "_F_" + propIndex
                queryWhere += "?" + className + " <" + item.propertyId + "> " + propertyLabel + "." +
                    " FILTER (" + getPropertyFilter(item, propertyLabel) + ")"
                propIndex += 1


            })
        }
        var fromStr = ""
        var graphUri = Config.sources[  MainController.currentSource].graphUri
        if (graphUri && graphUri != "") {
            if (!Array.isArray(graphUri))
                graphUri = [graphUri];
            graphUri.forEach(function (item) {
                fromStr += " FROM <" + item + "> "
            })
        }
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct "+selectProps+ " " + fromStr + "   WHERE { " +
            queryWhere + " " + querySelectProps +
            "}limit 1000 "

        var url = Config.sources[  MainController.currentSource].sparql_url + "?query=&format=json";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, null, function (err, result) {
            if (err) {
                return err
            }

            var dataSet = [];
            var cols =[];
            result.head.vars.forEach(function(item){
                cols.push({title: item})
            })
            result.results.bindings.forEach(function (item, indexRow) {
                var line = []
                result.head.vars.forEach(function (col, indexCol) {
                    if (item[col])
                        line.push(item[col].value);
                    else
                        line.push("");
                })
                dataSet.push(line)
            })
            $("#OntologyBrowser_tabs").tabs( "option", "active", 1 );

            $('#OntologyBrowser_tabs_result').html("<table id='dataTableDiv'></table>");
            setTimeout(function () {
                $('#dataTableDiv').DataTable({
                    data: dataSet,
                    columns: cols,
                    // async: false,
                    dom: 'Bfrtip',
                    buttons: [
                        'copy', 'csv', 'excel', 'pdf', 'print'
                    ]


                })
                    , 500
            })

        })

    }

    return self;


})()
