var authentication = (function () {

    var self = {}
// pb avec l'url sur serveur a cause d'nginx qui n'adment pas authentication ??? voir config version antérieure déployéee
    // self.authenticationUrl = "../authentication";
    var authenticationDBUrl = Config.serverUrl;
    self.userIndexes = [];
    self.currentUser = {};


    self.init = function (activate) {
        var url = window.location.host;
        if (config.loginMode != "none") {//  && url.indexOf("localhost")<0 && url.indexOf("127.0.0.1")<0){


            $("#loginDiv").css("visibility", "visible");
            $("#main").css("visibility", "hidden");
            var width = $(window).width()
            var height = $(window).height()
            $("#loginDiv").width(width).height(height).css("background-color", "#e5ebea").css("top", "0px").css("left", "0");
            ;
            // $("#panels").css("display", "none")

        } else {
            authentication.currentUser = {
                identifiant: "admin",
                login: "none",
                groupes: "admin"
            }
            if (typeof sparql_abstract !== 'undefined')
            sparql_abstract.initSources()
            //   mainController.init0();
        }

    }

    self.doLogin = function (callback) {
        var login = $("#loginInput").val();
        var password = $("#passwordInput").val();
        $("#main").css("visibility", "hidden");

        /*   if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)) {
               $("#loginMessage").html("invalid  login : Minimum eight characters, at least one uppercase letter, one lowercase letter and one number");
           }*/
        var user = null;
        async.series([
            function (callbackSeries) {
                if (config.loginMode == "none") {
                    user = {
                        identifiant: "none",
                        login: "none",
                        groupes: "admin"
                    }
                }
                if (config.loginMode != "database")
                    return callbackSeries();
                self.doLoginDatabase(login, password, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    user = result;
                    return callbackSeries();
                });

            },
            function (callbackSeries) {
                if (config.loginMode != "json")
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

    self.doLoginJson = function (login, password, callback) {


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
                    return callback(err);

                else if (data.length == 0) {
                    return callback();

                }
                var user = {
                    identifiant: login,
                    nomComplet: login,
                    groupes: data,
                };
                self.currentUser = user;
                return callback(null, user);

                // $("#panels").css("display", "block")


            }, error: function (err) {

                return callback(err);


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
