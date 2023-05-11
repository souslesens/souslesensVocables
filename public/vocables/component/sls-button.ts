import { html, component } from "haunted";

function SlsButton() {
    return html`
        <style>
            button {
                background-color: white;
                border: 1px solid;
                border-radius: 3px;
                color: var(--bs-primary);
                font-size: 0.875rem;
                cursor: pointer;
                transition: background-color 0.3s ease-in-out, color 0.3s ease-in-out;
            }
            button:hover {
                color: white;
                color: #fff;
                background-color: var(--bs-primary);
                border-color: var(--bs-primary);
            }
        </style>

        <button><slot></slot></button>
    `;
}

customElements.define("sls-button", component(SlsButton));

// @customElement("sls-button")
// export class SlsButton extends LitElement {
//     @property({ type: String }) label = "Click me";

//     static styles = css`
//     `;

//     render() {
//         return html`<button><slot></slot></button> `;
//     }
// }
