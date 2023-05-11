import { html, component } from "haunted";

function LeftPanel() {
    return html`
        <style></style>
        <div id="leftPanelDiv">
            <div id="accordion">
                <h3><span id="toolsListPanelDiv" class="title">Tools </span></h3>
                <div id="tools-panel" style="margin: 5px" class="max-height">
                    <div class="max-height" id="toolsTreeDiv" class="jstree"></div>
                </div>

                <h3><span class="title" id="toolPanelLabel"> </span></h3>
                <div id="toolPanelDiv" class="max-height">
                    <div id="actionDivContolPanelDiv"></div>
                    <div id="actionDiv" class="jstree"></div>
                </div>
            </div>
        </div>
    `;
}

customElements.define("sls-left-panel", component(LeftPanel, { useShadowDOM: false }));
