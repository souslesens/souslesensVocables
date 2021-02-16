/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var jsonFileStorage = require('./jsonFileStorage.js');
var path = require('path');
var logger = require("./logger..js");
//var mySqlProxy = require("./mySQLproxy..js");
const bcrypt = require('bcrypt');
var async = require("async");
var saltRounds = 10;
var authentication = {
    superAdministrator: "JosWres17",


    authentify: function (login, password, callback) {
         var usersLocation="../config/users/users.json";
        //  var usersLocation=path.resolve(,"../config/users/users.json");
        var usersLocation = path.join(__dirname, "../config/users/users.json")
        jsonFileStorage.retrieve(path.resolve(usersLocation), function (err, users) {
            if (err) {
                logger.error(login + " connected")
                return callback(err);
            }
            if (users[login] && users[login].password == password) {
                callback(null, users[login].groups);
            } else {
                callback("Invalid login or password");
            }


        })


    },

    loginInDB: function (login, password, callback) {
        if (login == authentication.superAdministrator) {
            return callback(null, {
                identifiant: "super-administateur",
                nomComplet: "super administateur",
                groups: "ADMIN"
            })
        }
        if (password == login)
            return callback("changePassword");


        var sql = "select * from utilisateur where identifiant='" + login + "'";
        mySqlProxy.exec(null, sql, function (err, result) {
            if (err) {
                return callback(err);
            }

            if (result.length == 0) {
                return callback("invalidLogin");
                logger.info("! AUTHENTICATION "+login + " invalidLogin")
            }
            bcrypt.compare(password, result[0].motDePasse, function (err, res) {
                if (err || res === false) {
                    logger.info("! AUTHENTICATION "+login + " invalidPassword")
                    return callback("invalidLogin");
                }
                var user = result[0];
                delete user.motDePasse;
                user.groups=user.groupes;
                delete user.groupes;
                logger.info("! AUTHENTICATION "+login + " logged")
                return callback(null, user);

            })


        })


    },
    enrole: function (users, callback) {
        if (!Array.isArray(users)) {
            users = [users];
        }
        async.eachSeries(users, function (user, callbackEach) {
            if (!user.motDePasse)
                user.motDePasse = user.identifiant
            bcrypt.hash(user.motDePasse, saltRounds, function (err, hash) {
                user.motDePasse = hash;
                var sql;
                if (user.id)//modification
                    sql = "update  utilisateur set identifiant='" + user.identifiant + "',nomComplet='" + user.nomComplet + "',groupes='" + user.groupes + "' where id=" + user.id + "";
                else
                    sql = "insert into utilisateur (identifiant,nomComplet,motDePasse,groupes) values ('" + user.identifiant + "','" + user.nomComplet + "','" + user.motDePasse + "','" + user.groupes + "')";
                mySqlProxy.exec(null, sql, function (err, result) {
                    if (err)
                        return callbackEach(err)
                    logger.info("! AUTHENTICATION "+user.identifiant + " enroled")
                    callbackEach();
                })
            })

        }, function (err) {
            if (err)
                return callback(err);
            callback(null, "done");

        })
    },

    changePassword: function (login, oldPassword, newPassword, callback) {
        authentication.loginInDB(login, oldPassword, function (err, result) {
            if (err && err != "changePassword" )
                if(login!=oldPassword) {// on autorise la changement si le login ==password dans ce cas on loggue le changement
                    return callback(err);
                }
            else
                    logger.info("! AUTHENTICATION "+login + " changing password")


            if (!newPassword.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)) {
                callback("invalid  login : Minimum eight characters, at least one uppercase letter, one lowercase letter and one number");
            }
            bcrypt.hash(newPassword, saltRounds, function (err, hash) {
                var sql = "update  utilisateur  set motDePasse='" + hash + "' where identifiant='" + login + "'";
                mySqlProxy.exec(null, sql, function (err, result) {
                    if (err)
                        return callback(err);
                    return callback(null, "done")

                })
            })

        })
    },


    testEncrypt: function () {
        const bcrypt = require('bcrypt');
        const saltRounds = 10;
        const myPlaintextPassword = 's0/\/\P4$$w0rD';
        const someOtherPlaintextPassword = 'not_bacon';

        var mysHash;

        bcrypt.hash(myPlaintextPassword, saltRounds, function (err, hash) {
            mysHash = hash;
            bcrypt.compare(someOtherPlaintextPassword, mysHash, function (err, res) {
                var x = res
            });
        });

    }


}
/*authentication.authentify("Claude","CF1",function (err,result){
    var x=result;
})*/


//authentication.testEncrypt();

module.exports = authentication;
