import _botEngine from "./_botEngine.js";


var Lookups_bot = (function () {
    var self = {};
    self.start = function (workflow, _params, callbackFn) {
        self.title = _params.title || "LookUps Bot";
        _botEngine.startParams = _botEngine.fillStartParams(arguments);
        self.callbackFn = callbackFn;
        if (!workflow) {
            workflow = self.workflow;
        }
        _botEngine.init(Lookups_bot, workflow, null, function () {
            self.params = {};
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            _botEngine.nextStep();
        });
    }

    self.workflowColumnmMappingOther = {
        startFn: {}};

    self.functionTitles = {}

    self.functions = {}
})

export default Lookups_bot;
window.Lookups_bot = Lookups_bot;
