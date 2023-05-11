import { html, component } from "haunted";

function CentralPanel() {
    return html`
        <style>
            #centralPanelDiv {
                height: 100vh;
                display: flex;
            }

            #graphDiv {
                border: 2px solid #ddd;
                flex-grow: 1;
                margin: 3px;
            }
        </style>
        <div id="centralPanelDiv">
            <div id="graphDiv"></div>
        </div>
    `;
}

customElements.define("sls-central-panel", component(CentralPanel, { useShadowDOM: false }));
