import { html, component } from "haunted";

function App() {
    return html` <style>
            .app-container {
                display: flex;
                flex-grow: 1;
            }

            sls-left-panel,
            sls-right-panel {
                flex: 1;
            }

            sls-central-panel {
                flex: 10;
            }
        </style>

        <div>
            <sls-header></sls-header>
            <div class="app-container">
                <sls-left-panel></sls-left-panel>
                <sls-central-panel></sls-central-panel>
                <sls-right-panel></sls-right-panel>
            </div>
            <div id="graphPopupDiv" onclick="MainController.UI.hidePopup('graphPopupDiv');"></div>

            <div id="mainDialogDiv"></div>

            <div id="smallDialogDiv"></div>

            <!-- Footer -->
            <footer class="bg-white">
                <div class="row px-2">
                    <div class="col">
                        <a target="_blank noreferrer" href="https://github.com/souslesens/souslesensVocables"
                            ><span style="color: Black"><i class="fa-lg fab fa-github"></i></span
                        ></a>
                        SouslesensVocables <span id="souslesensversion"></span>
                    </div>
                    <div class="col text-end"></div>
                </div>
            </footer>
        </div>`;
}

customElements.define("my-app", component<HTMLElement>(App, { useShadowDOM: false, observedAttributes: [] }));
