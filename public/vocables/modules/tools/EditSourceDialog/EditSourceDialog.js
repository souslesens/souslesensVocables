// imports React app
import * as _ from "/assets/edit_source_dialog.js";

const createApp = window.EditSourceDialog.createApp;

window.EditSourceDialog = (function () {
    const self = {};
    let root = null;
    const divId = "mount-edit-source-dialog-here";

    self.close = () => {
        if (!root) {
            throw new Error("React app not mounted");
        }
        root.unmount();
    };
    self.open = (sourceName) => {
        if (createApp === null) {
            throw new Error("React app is not ready");
        }
        if (!document.getElementById(divId)) {
            let elemDiv = document.createElement("div");
            elemDiv.id = divId;
            document.body.appendChild(elemDiv);
        }
        root = createApp({ sourceName, onClose: self.close });
    };
    return self;
})();
