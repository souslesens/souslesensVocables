import { LitElement, html } from "lit-element";
import { property } from "lit/decorators.js";
import $ from "jquery";
import "jstree";

class Tree extends LitElement {
    @property({ attribute: "data-tree", type: Array })
    data = [];
    connectedCallback() {
        super.connectedCallback();
        const container = $(this); // Select the current element as the container

        container.jstree({ core: { data: this.data } });
    }

    render() {
        return html`<slot></slot>`;
    }
}

customElements.define("sls-tree", Tree);
