var ADLbrowserDataTable=(function(){
    var self={}


    self.showQueryResult= function (data, options) {


        var dataSet = [];
        var cols = [];
var keys={}

            options.selectVars.forEach(function (varName) {

                var key = varName.substring(1)
                cols.push({title: key})
                cols.push({title: key+"Label"})
                keys[key] = 1
                keys[key+"Label"] = 1
            })
        data.data.forEach(function (item, indexRow) {
            var line = []
         for(var key in keys  ){
                if (item[key])
                    line.push(item[key].value);
                else
                    line.push("");
            }
            dataSet.push(line)
        })


        //  $("#ADLquery_tabs").tabs("option", "active", 1);
        $('#mainDialogDiv').dialog("open")

        $('#mainDialogDiv').html("<table id='dataTableDiv'></table>");
        setTimeout(function () {

            $('#dataTableDiv').DataTable({
                data: dataSet,
                columns: cols,
                // async: false,
                "pageLength": 15,
                dom: 'Bfrtip',
                buttons: [
                    'copy', 'csv', 'excel', 'pdf', 'print'
                ]


            })
                , 500
        })


    }
    return self;
})()