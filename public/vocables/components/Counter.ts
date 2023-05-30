import { html, component } from "haunted";
import { useStore } from "@nanostores/preact";
import { increment, counter } from "../store/counter";

function Counter() {
    const value = useStore(counter);

    return html`
        <div part="count">${value}</div>
        <button part="button" @click=${() => increment()}>Increment</button>
    `;
}

customElements.define("my-counter", component(Counter));
