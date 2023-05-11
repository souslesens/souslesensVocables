import { html, component } from "haunted";

function App() {
    return html` <div>
        <div class="rowXXX" style="display: flex; flex-direction: column; min-height: 30px">
            <sls-header></sls-header>
            <div style="display: flex; flex-direction: row; justify-content: left">
                <div id="leftPanelDiv" style="max-width: 400px; height: 90vh">
                    <div id="accordion">
                        <h3><span id="toolsListPanelDiv" class="title">Tools </span></h3>
                        <div id="tools-panel" style="margin: 5px" class="max-height">
                            <div class="max-height" id="toolsTreeDiv" class="jstree"></div>
                        </div>

                        <h3><span class="title" id="toolPanelLabel"> </span></h3>
                        <div id="toolPanelDiv" style="margin: 5px; height: 900px !important; overflow: auto" class="max-height">
                            <div id="actionDivContolPanelDiv"></div>
                            <div id="actionDiv" class="jstree"></div>
                        </div>
                    </div>
                </div>

                <div id="centralPanelDiv" style="display: flex; flex-direction: row">
                    <div id="graphDiv"></div>
                </div>
                <div id="rightPanelDiv" style="display: flex; flex-direction: row; margin-top: 10px; z-index: 20">
                    <div
                        onclick="MainController.UI.showHideRightPanel()"
                        style="margin-top: 10px; margin-left: -40px; height: 45px; width: 60px; padding: 5px; background: #fcfcfc; border-radius: 10px; border: 1px solid #ccc"
                    >
                        <input id="rightPanelDiv_searchIconInput" type="image" src="./icons/search.png" />
                    </div>
                    <div id="rightPanelDivInner" style="display: flex; flex-direction: column"></div>
                </div>
                <div id="graphPopupDiv" onclick="MainController.UI.hidePopup('graphPopupDiv');"></div>
            </div>
        </div>
        <div id="loginDiv" style="position: absolute; visibility: hidden; display: flex; justify-content: center; align-items: center">
            <div>
                login<input id="loginInput" /> password<input
                    type="password"
                    id="passwordInput"
                    onkeydown="if (event.keyCode == 13 || event.keyCode == 9){document.getElementById('loginButton').click()
}"
                />
                <button id="loginButton" onclick="authentication.doLogin(MainController.onAfterLogin)">OK</button>

                <div id="loginMessage" style="margin: 20px; font-size: 14px; color: saddlebrown"></div>
            </div>
        </div>

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
