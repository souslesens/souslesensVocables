import { html, component, useState } from "haunted";

function Counter() {
    const [count, setCount] = useState(0);

    return html`
        <div part="count">${count}</div>
        <button part="button" @click=${() => setCount(count + 1)}>Increment</button>
    `;
}

customElements.define("my-counter", component(Counter));
