/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import mysql from 'mysql';

//var nodeMaria = require('node-mariadb');

var numberTypes = ["float", "double", "decimal", "int"];
var stringTypes = ["char", "varchar", "text"];

var connections = {};
var mySQLproxy = {
    _dataModel: null,
    getConnection: function (connOptions, callback) {
        if (!connOptions) connOptions = mySqlConnectionOptions;
        var connectionKey = connOptions.host + ";" + connOptions.database;
        if (!connections[connectionKey]) {
            var connection = mysql.createConnection(connOptions);

            connection.connect(function (err) {
                if (err) return callback(err);
                console.log("Connected!");
                connections[connectionKey] = connection;
                callback(null, connection);
            });
        } else callback(null, connections[connectionKey]);
    },

    exec: function (connection, sql, callback) {
        mySQLproxy.getConnection(connection, function (err, conn) {
            if (err) return callback(err);

            conn.query(sql, function (err, result) {
                if (err) return callback(err);
                return callback(null, result);
            });
        });
    },

    datamodel: function (connection, callback) {
        // var excludedTables=["users","r_versement_magasin"];
        var excludedTables = [];
        mySQLproxy.getConnection(connection, function (err, conn) {
            if (err) return callback(err);
            var sql = 'SELECT * FROM information_schema.columns where table_schema="' + mySqlConnectionOptions.database + '"';
            conn.query(sql, function (err, result) {
                if (err) return callback(err);

                var model = {};
                result.forEach(function (line) {
                    if (line.TABLE_NAME.indexOf("r_") == 0 || excludedTables.indexOf(line.TABLE_NAME) > -1);
                    else {
                        //relation
                        if (!model[line.TABLE_NAME]) model[line.TABLE_NAME] = [];

                        model[line.TABLE_NAME].push({
                            name: line.COLUMN_NAME,
                            columnType: line.COLUMN_TYPE,
                            dataType: line.DATA_TYPE,
                            nullable: line.IS_NULLABLE,
                            defaultValue: line.COLUMN_DEFAULT,
                            maxLength: line.CHARACTER_MAXIMUM_LENGTH,
                            numericScale: line.NUMERIC_SCALE,
                        });
                    }
                });
                mySQLproxy._dataModel = model;
                return callback(null, model);
            });
        });
    },
    getFieldType: function (table, fieldName) {
        var type;

        mySQLproxy._dataModel[table].forEach(function (field) {
            if (field.name == fieldName) type = field.dataType;
        });

        if (numberTypes.indexOf(type) > -1) return "number";
        if (stringTypes.indexOf(type) > -1) return "string";

        return type;
    },
};

export default mySQLproxy;