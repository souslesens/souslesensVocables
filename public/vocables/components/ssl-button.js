import { define, html } from "https://esm.sh/hybrids@^8";

export default define({
    tag: "ssl-button",
    render: () => html`
        <link rel="stylesheet" href="https://unpkg.com/tailwindcss@^1.0/dist/tailwind.min.css" />
        <button onclick="${onclick}" type="button" class="border-2 border-blue-700 hover:text-white hover:bg-blue-700 text-blue-700 px-4 rounded" style="font-weight: bold">
            <slot></slot>
        </button>
    `,
});
