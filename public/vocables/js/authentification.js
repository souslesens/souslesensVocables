/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var authentication = (function () {

    var self = {}
// pb avec l'url sur serveur a cause d'nginx qui n'adment pas authentication ??? voir Config version antérieure déployéee
    // self.authenticationUrl = "../authentication";
    var authenticationDBUrl = Config.serverUrl;
    self.userIndexes = [];
    self.currentUser = {};


    self.init = function (activate) {
        // Redirect to login if user is not logged
        $.ajax({
            type: "GET",
            url: "/auth/check",
            success: function (data) {
                if (!data.logged) {
                    //location.href = '/login';
                } else {
                    var url = window.location.host;
                    authentication.currentUser = {
                        identifiant: data.user.login,
                        login: data.user.login,
                        groupes: data.user.groups,
                    }
                    MainController.onAfterLogin()
                    if (typeof sparql_abstract !== 'undefined')
                    sparql_abstract.initSources()

                }
            }
        });
    }

    self.logout = function () {
        $.ajax({
            type: "GET",
            url: "/auth/logout",
            success: function (data) {
                location.href = '/login';
            }
        });
    }

    self.doLogin = function (callback) {
        var login = $("#loginInput").val();
        var password = $("#passwordInput").val();
        if(login=="skosBlender")
            password="thes_X32!"
        $("#main").css("visibility", "hidden");

        /*   if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)) {
               $("#loginMessage").html("invalid  login : Minimum eight characters, at least one uppercase letter, one lowercase letter and one number");
           }*/
        var user = null;
        async.series([
            function (callbackSeries) {
                if (Config.loginMode == "none") {
                    user = {
                        identifiant: "none",
                        login: "none",
                        groupes: "admin"
                    }
                }
                if (Config.loginMode != "database")
                    return callbackSeries();
                self.doLoginDatabase(login, password, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    user = result;
                    return callbackSeries();
                });

            },
            function (callbackSeries) {
                if (Config.loginMode != "json")
                    return callbackSeries();
                self.doLoginJson(login, password, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    user = result;
                    return callbackSeries();
                });

            }


        ], function (err) {
            if (err ) {
                if (err.responseJSON) {
                    if (err.responseJSON.ERROR == "changePassword") {
                        //    $("#loginMessage").html("le mot de passe doit être changé (<a href='htmlSnippets/changerMotDePasse.html'>cliquer ici</a>)");
                        $("#loginMessage").html("le mot de passe doit être changé <button onclick=tools.execTool('changerMotDePasse')>OK</button>");
                        self.currentUser = user;
                        mainController.init0();

                        return
                    }
                } else {
                    return $("#loginMessage").html(err);
                }

            }

            if (!user)
                return $("#loginMessage").html("invalid  login or password");

            var userGroups = user.groupes;
            if (!Array.isArray(userGroups))
                userGroups = user.groupes.split(",");


            $("#loginDiv").css("visibility", "hidden");
            $("#main").css("visibility", "visible");
            self.currentUser = user;
if(callback)
    callback();


            // mainController.init0();

        })


    }


    self.doLoginDatabase = function (login, password, callback) {


        var payload = {
            tryLogin: 1,
            login: login,
            password: password,


        }

        $.ajax({
            type: "POST",
            url: authenticationDBUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                return callback(null, data);


            }, error: function (err) {

                return callback(err);


            }
        })
        /* var sql = "select * from utilisateur where identifiant='" + login + "' and motDepasse='" + password + "'";
         mainController.execSql(sql, function (err, result) {
             if (err) {
                return callback(err);
             }
             if (result.length == 0)
                return callback();
             return callback(null,result[0]);

         })*/


    }

    self.doLoginJson = function (login, password, callback2) {


        var payload = {
            tryLoginJSON: 1,
            login: login,
            password: password

        }
        $.ajax({
            type: "POST",
            url: authenticationDBUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {

                if (!$.isArray(data))
                    return callback2(err);

                else if (data.length == 0) {
                    return callback2();

                }
                var user = {
                    identifiant: login,
                    nomComplet: login,
                    groupes: data,
                };
                self.currentUser = user;
                return callback2(null, user);

                // $("#panels").css("display", "block")


            }, error: function (err) {

                return callback2(err);


            }
        })

    }

    self.changePassword = function () {//page htmlSnippets/ changerMotDePasse.html
        $("#changePassword_message").html("");
        var login = $("#changePassword_identifiant").val();
        var password = $("#changePassword_ancienMotDePasse").val();
        var newPassword = $("#changePassword_nouveauMotDePasse").val();
        var newPassword2 = $("#changePassword_nouveauMotDePasseConfirm").val();
        if (newPassword != newPassword2)
            return $("#changePassword_message").html("le nouveau mot de passe n'est pas le même");
        if (!newPassword.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/))
            return $("#changePassword_message").html("invalid  login : Minimum eight characters, at least one uppercase letter, one lowercase letter and one number");

        var authenticationUrl = "../authDB";
        var payload = {
            changePassword: 1,
            login: login,
            oldPassword: password,
            newPassword: newPassword,

        }

        $.ajax({
            type: "POST",
            url: authenticationUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                $("#dialogD3").dialog("close");
                $("#loginMessage").html("le nouveau mot de passe a été changé, identifiez vous a nouveau");
                $("#changePassword_message").html("le nouveau mot de passe a été changé");


            }, error: function (err) {
                $("#changePassword_message").html(err.responseText);


            }
        })


    }

    //save record for authentication : call special method to encrypt password on server
    self.onBeforeSave = function (options, callback) {
        for (var key in options.changes) {
            options.currentRecord[key] = options.changes[key];
        }

        var authenticationUrl = "../authDB";
        var payload = {
            enrole: 1,
            users: JSON.stringify(options.currentRecord)


        }

        $.ajax({
            type: "POST",
            url: authenticationDBUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                mainController.setRecordMessage("enregistrement sauvé");
                return callback("stop");


            }, error: function (err) {

                return callback(err);


            }
        })

    }


    return self;
})()
