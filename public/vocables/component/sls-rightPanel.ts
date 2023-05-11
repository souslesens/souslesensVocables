import { html, component } from "haunted";

function RightPanel() {
    return html`
        <style>
            #rightPanelDiv {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
        </style>
        <div id="rightPanelDiv">
            <div onclick="MainController.UI.showHideRightPanel()">
                <input id="rightPanelDiv_searchIconInput" type="image" src="icons/search.png" />
            </div>
            <div id="rightPanelDivInner"></div>
        </div>
    `;
}

customElements.define("sls-right-panel", component(RightPanel, { useShadowDOM: false }));
