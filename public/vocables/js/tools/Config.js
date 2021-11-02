var Config = (function () {
    var self = {};

    self.onSourceSelect = function () {}

    self.onLoaded = function () {

            $("#accordion").accordion("option", {active: 2});

            setTimeout(function () {
                $("#graphDiv").html("");
                $("#graphDiv").html(`
                    <div id="mount-app-here"></div>
                `);
                $.getScript("/mainapp.js");

            }, 200)

    }

    return self;

})
()
