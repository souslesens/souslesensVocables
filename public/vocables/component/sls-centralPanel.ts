import { component, html } from "haunted";
import { useStore } from "@nanostores/preact";
import { state } from "../store/state";

function CentralPanel() {
    const value = useStore(state);

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
            <div id="graphDiv">${value === "Init" && html`<sls-credit-image></sls-credit-image>`}</div>
        </div>
    `;
}
customElements.define("sls-central-panel", component(CentralPanel, { useShadowDOM: false }));
