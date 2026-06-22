import * as _ from "/assets/logs_table_modal.js";

const createApp = window.LogsTableModal.createApp;

window.LogsTableModal = (function () {
    const self = {};
    let root = null;
    const divId = "mount-logs-table-here";

    self.close = () => {
        if (!root) {
            throw new Error("React app not mounted");
        }
        root.unmount();
    };
    self.open = () => {
        if (createApp === null) {
            throw new Error("React app is not ready");
        }
        if (!document.getElementById(divId)) {
            let elemDiv = document.createElement("div");
            elemDiv.id = divId;
            document.body.appendChild(elemDiv);
        }
        root = createApp();
    };
    return self;
})();
