// eslint-disable-next-line @typescript-eslint/no-unused-vars
var ConfigEditor = (function () {
    var self = {};

    self.onSourceSelect = function () {
        // Pass
    };

    self.onLoaded = function () {
        $("#accordion").accordion("option", { active: 2 });

        setTimeout(function () {
            $("#graphDiv").html("");
            $("#graphDiv").html(`
                    <div id="mount-app-here"></div>
                `);
            $.getScript("/assets/index.js");
        }, 200);
    };

    return self;
})();

export default ConfigEditor;

window.ConfigEditor = ConfigEditor;
