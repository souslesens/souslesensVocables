import { html, component } from "haunted";

function SlsHeader() {
    return html`
        <style>
            .app-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                background-color: var(--bs-gray-dark);
                color: #fff;
            }

            .app-header h1 {
                margin-left: 1rem;
            }

            .app-header nav a,
            .app-header nav button {
                color: #fff;
                text-decoration: none;
                margin-right: 16px;
                background-color: transparent;
                border: none;
                cursor: pointer;
            }
        </style>
        <header class="app-header">
            <div>
                <h1>SousLeSens</h1>
            </div>
            <nav>
                <a href="./browse.html" target="_blank">Search</a>
                <button onclick="MainController.showPart14AxiomsImage()">Axioms</button>
                <button onclick="MainController.UI.copyCurrentQuery()">cpQy</button>
                <sls-user-account-dropdown></sls-user-account-dropdown>
            </nav>
        </header>
    `;
}

customElements.define("sls-header", component(SlsHeader, { useShadowDOM: false }));
