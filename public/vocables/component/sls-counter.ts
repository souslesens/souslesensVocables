import { html } from "lit-html";
import { component } from "haunted";
import { counter } from "../store/counter";
import { useStore } from "@nanostores/preact";

function Counter() {
    const value = useStore(counter);

    return html`
        <div part="count">${value}</div>
        <button part="button" @click=${() => counter.set(counter.get() + 1)}>Increment</button>
    `;
}

customElements.define("sls-counter", component(Counter));
