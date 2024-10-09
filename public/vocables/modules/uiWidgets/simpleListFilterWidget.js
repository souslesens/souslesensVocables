var SimpleListFilterWidget = (function () {
    var self = {};
    self.lastFilterListStr = "";
    self.filterList = function (evt, selectListId) {
        //selectId,list,withBlankNode,labelKey,idKey) {

        //var str = $(this).val();
        var str = $(evt.currentTarget).val();
        if (!str || str.length <= self.lastFilterListStr.length) {
            return;
        }
        self.lastFilterListStr = str;
        str = str.toLowerCase();

        var selection = [];

        if (!self.initialOptions) {
            self.initialOptions = [];
        }

        $("#" + selectListId)
            .find("option")
            .each(function () {
                var label = $(this).text();
                var id = $(this).val();
                selection.push({ id: id, label: label });
            });
        self.initialOptions.forEach(function (item) {
            if (item.label.toLowerCase().indexOf(str) > -1) {
                selection.push({ item });
            }
        });
        common.fillSelectOptions(selectListId, selection, false, "label", "id");
    };

    return self;
})();

export default SimpleListFilterWidget;
window.SimpleListFilterWidget = SimpleListFilterWidget;
