import MainController from "./mainController.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var authentication = (function () {
    var self = {};
    // pb avec l'url sur serveur a cause d'nginx qui n'adment pas authentication ??? voir Config version antérieure déployéee
    // self.authenticationUrl = "../authentication";
    self.userIndexes = [];
    self.currentUser = {};

    self.init = function (callback) {
        if (false && Config.loginMode == "json") {
            var login = prompt("enter login");
            var pss = prompt("enter password");
            if (login && pss);
        }
        // Redirect to login if user is not logged
        $.ajax({
            type: "GET",
            url: "/api/v1/auth/whoami",
            success: function (data) {
                if (!data.logged) {
                    location.href = "/login";
                } else {
                    // data.user.groups.push("Annotator")

                    authentication.currentUser = {
                        identifiant: data.user.login,
                        login: data.user.login,
                        groupes: data.user.groups,
                    };
                    $("#user-username").html(" " + authentication.currentUser.identifiant);
                    if (data.authSource == "keycloak") {
                        $("#manage-account").attr("href", data.auth.authServerURL + "/realms/" + data.auth.realm + "/account?referrer=" + data.auth.clientID);
                    } else {
                        // eslint-disable-next-line no-console
                        console.log("hide account management");
                        $("#manage-account-li").hide();
                    }

                    if (typeof sparql_abstract !== "undefined") sparql_abstract.initSources();
                }
                callback();
            },
            error: function (err) {
                callback(err);
            },
        });
    };

    self.logout = function () {
        $.ajax({
            type: "GET",
            url: "/api/v1/auth/logout",
            success: function (data) {
                location.href = data.redirect;
            },
            error: function (err) {
                MainController.errorAlert(err);
            },
        });
    };

    return self;
})();

export default authentication;

window.authentication = authentication;
