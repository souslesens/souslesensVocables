const sql = require('mssql')

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

    }


}
module.exports = SQLserverConnector
//SQLserverConnector.getADLmodel()

//SQLserverConnector.test()