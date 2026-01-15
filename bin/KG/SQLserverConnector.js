/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import sql from 'mssql';

import ConfigManager from '../configManager.js';

//update dbo.QUANTUM_BOMST_TPUK_ELFR set breakdown= left (Functional_Location,(LEN(Functional_Location) -  CHARINDEX('/', REVERSE(Functional_Location))))
//update dbo.QUANTUM_BOMST_TPUK_ELFR set tag= RIGHT(Functional_Location, CHARINDEX('/', REVERSE('/' + Functional_Location)) - 1)

/*
select Functional_Location,  RIGHT(Functional_Location, CHARINDEX('/', REVERSE('/' + Functional_Location)) - 1)
  FROM [EF_SAP].[dbo].[QUANTUM_BOMST_TPUK_ELFR]



update [EF_SAP].[dbo].[Functional_Locations_IH06] set functionalClass=FunctionalClassID
  FROM [MDM_2.3_AFTWIN].[adl].[tblTag] c  JOIN [EF_SAP].[dbo].[Functional_Locations_IH06] t  on c.tagnumber=t.tag

update [EF_SAP].[dbo].[QUANTUM_BOMST_TPUK_ELFR] set RDL_physicalClassId=PhysicalClassID
  FROM [MDM_2.3_AFTWIN].[adl].[tblModel] c  JOIN [EF_SAP].[dbo].[QUANTUM_BOMST_TPUK_ELFR] t  on c.[ModelNumber]=t.[Manufacture_Part_Number]



update [EF_SAP].[dbo].[QUANTUM_BOMST_TPUK_ELFR] set RDL_physicalClassLabel=name
  FROM [rdlquantum].[rdl].[tblPhysicalClass] c  JOIN [EF_SAP].[dbo].[QUANTUM_BOMST_TPUK_ELFR] t  on c.[ModelNumber]=t.[Manufacture_Part_Number]

update [EF_SAP].[dbo].[QUANTUM_BOMST_TPUK_ELFR] set RDL_functionalClassLabel=name
FROM [rdlquantum].[rdl].[tblfunctionalClass] c  JOIN [EF_SAP].[dbo].[QUANTUM_BOMST_TPUK_ELFR] t  on c.id=t.RDL_functionalClassId




*/
//sudo docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=Fa1#majeur' -e 'MSSQL_PID=Express' -p 1433:1433 --restart always  -v /var/opt/mssql/data:/var/opt/mssql/data -v /var/opt/mssql/log:/var/opt/mssql/log -v /var/opt/mssql/secrets:/var/opt/mssql/secrets -d mcr.microsoft.com/mssql/server:2017-latest-ubuntu

// DUMP

/*
SQL query
Backup Database [clov] To Disk =     '/home/debian/backups/clov'


get backup
sudo docker ps
sudo docker exec -t -i 75d81c946c51 /bin/bash
cd /home/debian/backups/
sudo docker cp 75d81c946c51:/home/debian/backups /home/debian/backupsSQLserver
zip -r backupsSQLserverSept2021.zip backups/backupsSQLserver/

scp backupsSQLserverSept2021.zip  xxx/var/lib/nodejs/souslesensVocables/public/dumps
sur serveur datalab
wget xxx/dumps/backupsSQLserverSept2021.zip


docker exec -t -i e775dc13f609 /bin/bash


cd dumpsSQLserver/backupsSQLserver


:/var/opt/mssql
docker cp  onemodel e775dc13f609:/var/opt/mssql/backups


  sqlcmd -U SA -P Fa1#majeur -q  "RESTORE DATABASE onemodel  FROM DISK=N'/var/opt/mssql/backups/onemodel'




/*
replace ' ' in column nams
SELECT 'EXEC sp_rename '''+QUOTENAME(TABLE_CATALOG)+'.'+QUOTENAME(TABLE_SCHEMA)+'.'+QUOTENAME(TABLE_NAME)+'.'+QUOTENAME(column_name)+''','''+REPLACE(column_name, ' ', '')+''',''COLUMN'''
FROM   information_schema.columns
WHERE  column_name LIKE '_%'



replace "-" in table Names

SELECT 'EXEC sp_rename '''+QUOTENAME(TABLE_CATALOG)+'.'+QUOTENAME(TABLE_SCHEMA)+'.'+QUOTENAME(TABLE_NAME)+''','''+REPLACE(table_name, '-', '_')+''''
FROM   information_schema.tables
WHERE  table_name LIKE '_%-%'

 */

var SQLserverConnector = {
    connection: null,

    getConnection: function () {
        return ConfigManager.config.SQLserver;
    },

    getData: function (dbName, query, callback) {
        var connection = SQLserverConnector.getConnection();
        connection.database = dbName;

        sql.connect(connection, (err) => {
            if (err) {
                console.log(err);
                return callback(err); // ... error checks
            }

            new sql.Request().query("use [" + dbName + "];" + query, (err, result) => {
                //  new sql.Request().query(query, (err, result) => {
                if (err) return callback(err);

                return callback(null, result.recordset);
            });
        });
    },

    getFetchedData: function (dbName, query, processorFn, fetchSize, uniqueTriples, callback) {
        var data = [];
        var connection = SQLserverConnector.getConnection();
        connection.database = dbName;
        var fetchedCount = 0;
        sql.connect(connection, (_err) => {
            // ... error checks

            const request = new sql.Request();
            request.stream = true; // You can set streaming differently for each request
            request.query(query); // or request.execute(procedure)

            request.on("recordset", (_columns) => {
                // Emitted once for each recordset in a query
            });

            request.on("row", (row) => {
                data.push(row);

                if (data.length >= fetchSize) {
                    request.pause();
                    fetchedCount += data.length;
                    processorFn(data, uniqueTriples, fetchedCount, function (_err, _resultProcessor) {
                        data = [];
                        request.resume();
                    });
                }

                // Emitted for each row in a recordset
            });

            request.on("rowsaffected", (_rowCount) => {
                // Emitted for each `INSERT`, `UPDATE` or `DELETE` statement
                // Requires NOCOUNT to be OFF (default)
            });

            request.on("error", (err) => {
                callback(err);
            });

            request.on("done", (_result) => {
                callback(null, data);
                // Always emitted as the last one
            });
        });
    },
    /*








    SELECT COLUMN_NAME,TABLE_NAME,TABLE_SCHEMA FROM INFORMATION_SCHEMA.COLUMNS where  TABLE_SCHEMA not in ('dbo') order by TABLE_SCHEMA,TABLE_NAME "


     */

    getKGmodel: function (dbName, callback) {
        var connection = SQLserverConnector.getConnection();
        connection.database = dbName;
        var query = "use [" + dbName + "]; SELECT COLUMN_NAME,TABLE_NAME,TABLE_SCHEMA\n" + "FROM INFORMATION_SCHEMA.COLUMNS";
        //   query +=" where  TABLE_SCHEMA not in ('dbo') order by TABLE_SCHEMA,TABLE_NAME "
        query += "  order by TABLE_SCHEMA,TABLE_NAME ";

        sql.connect(connection, (err) => {
            if (err) return console.log(err); // ... error checks

            // Query

            new sql.Request().query(query, (err, result) => {
                if (err) return callback(err);

                var model = {};
                result.recordset.forEach(function (item) {
                    var tableLabel = item.TABLE_SCHEMA + "." + item.TABLE_NAME;
                    /*   if(dbName=="MDM_2.3_AFTWIN")
                           tableLabel="dbo."+item.TABLE_NAME*/
                    if (!model[tableLabel]) {
                        model[tableLabel] = [];
                    }
                    model[tableLabel].push(item.COLUMN_NAME);
                });

                return callback(err, model);
            });
        });
    },
};
export default SQLserverConnector;
//SQLserverConnector.getKGmodel()

//SQLserverConnector.test()
