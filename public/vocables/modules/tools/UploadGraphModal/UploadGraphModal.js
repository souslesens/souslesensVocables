import * as _ from "/assets/upload_graph_modal.js";

const createApp = window.UploadGraphModal.createApp;

window.UploadGraphModal = (function () {
    const self = {};
    let root = null;
    const divId = "mount-edit-upload-graph-modal-here";

    self.close = () => {
        if (!root) {
            throw new Error("React app not mounted");
        }
        root.unmount();
    };
    self.open = (apiUrl, sourceName, onClose) => {
        if (createApp === null) {
            throw new Error("React app is not ready");
        }
        if (!document.getElementById(divId)) {
            let elemDiv = document.createElement("div");
            elemDiv.id = divId;
            document.body.appendChild(elemDiv);
        }
        root = createApp({
            apiUrl,
            sourceName,
            onClose: () => {
                self.close();
                onClose();
            },
        });
    };
    return self;
})();
