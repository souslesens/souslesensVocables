// imports React app
import * as _ from "/assets/download_graph_modal.js";

const createApp = window.DownloadGraphModal.createApp;

window.DownloadGraphModal = (function () {
    const self = {};
    let root = null;
    const divId = "mount-download-graph-modal-here";

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
