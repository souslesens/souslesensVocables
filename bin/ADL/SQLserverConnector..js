const sql = require('mssql')
const async=require('async')
const config = {
    user: 'sa',
    password: 'Fa1#majeur',
    server: '51.178.39.209', // You can use 'localhost\\instance' to connect to named instance
    database: 'rdlquantum',
}

//sudo docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=Fa1#majeur' -e 'MSSQL_PID=Express' -p 1433:1433 --restart always  -v /var/opt/mssql/data:/var/opt/mssql/data -v /var/opt/mssql/log:/var/opt/mssql/log -v /var/opt/mssql/secrets:/var/opt/mssql/secrets -d mcr.microsoft.com/mssql/server:2017-latest-ubuntu
var SQLserverConnector = {


    test: function () {
config.database="MDM_2.3_AFTWIN"
        sql.connect(config, err => {
            if (err)
                return console.log(err)// ... error checks

            // Query

            new sql.Request().query('select * from dbo.tblModel', (err, result) => {
                if (err)
                    // ... error checks

                    console.dir(result)
            })
        })
    },

    getData: function (dbName, query, callback) {
        config.database=dbName
        sql.connect(config, err => {
            if (err)
                return console.log(err)// ... error checks

            // Query
//console.log(query)
            new sql.Request().query( "use ["+dbName+"];"+query, (err, result) => {
                if (err)
                  return callback(err)

                return callback(null,  result.recordset)
            })
        })
    },
/*


SELECT COLUMN_NAME,TABLE_NAME,TABLE_SCHEMA FROM INFORMATION_SCHEMA.COLUMNS where  TABLE_SCHEMA not in ('dbo') order by TABLE_SCHEMA,TABLE_NAME "


 */

    getADLmodel: function (dbName, callback) {

        config.database=dbName
        var query = "use ["+dbName+"]; SELECT COLUMN_NAME,TABLE_NAME,TABLE_SCHEMA\n" +
            "FROM INFORMATION_SCHEMA.COLUMNS"
   //   query +=" where  TABLE_SCHEMA not in ('dbo') order by TABLE_SCHEMA,TABLE_NAME "
        query +="  order by TABLE_SCHEMA,TABLE_NAME "

        sql.connect(config, err => {
            if (err)
                return console.log(err)// ... error checks

            // Query

            new sql.Request().query(query, (err, result) => {
                if (err)
                    return callback(err)

                var model = {}
                result.recordset.forEach(function (item) {
                    var tableLabel=item.TABLE_SCHEMA+"."+item.TABLE_NAME
                 /*   if(dbName=="MDM_2.3_AFTWIN")
                        tableLabel="dbo."+item.TABLE_NAME*/
                    if (!model[tableLabel]) {
                        model[tableLabel] = []
                    }
                    model[tableLabel].push(item.COLUMN_NAME)


                })
                return callback(err, model);
            })
        })

    },

    processFetchedData:function(connection,query,fetchSize,startOffset,maxOffset, processor,callback){

        var offset = startOffset
        var length = 1
        var allResults = []
        if(!maxOffset)
            maxOffset=10000000
        async.whilst(
            function test(cb) {
                return cb(null, length > 0 && offset<maxOffset);
            },
            function iter(callbackWhilst) {


                //  query=query+" offset "+(""+offset);

                var query2 = query+" ORDER BY (SELECT NULL) OFFSET "+offset+" ROWS FETCH NEXT "+fetchSize+" ROWS ONLY"
                offset += fetchSize;
                console.log("processed lines: "+offset)
                SQLserverConnector.connection=connection;
                SQLserverConnector.getData(connection.dbName,query2,function (err, result) {
                    if (err) {
                        console.log("error "+err)
                        console.log(query2)
                        return callbackWhilst(err);
                    }
                    length = result.length
                    if(processor) {
                        processor(result, function (err, resultProcessor) {
                            if (err)  {

                                return callbackWhilst(err);
                            }
                            return callbackWhilst();
                        })
                    }
                    else{
                        allResults=allResults.concat(result);
                        return callbackWhilst();
                    }


                })
            },
            function (err, n) {
                if (err)
                    return callback(err);
                callback(null, allResults);

            }
        )





    },


}
module.exports = SQLserverConnector
//SQLserverConnector.getADLmodel()

//SQLserverConnector.test()