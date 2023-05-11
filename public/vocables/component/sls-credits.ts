import { html, component } from "haunted";

function CreditImage() {
    return html`
        <style>
            .image-container {
                display: flex;
                align-items: flex-start;
                justify-content: center; /* center the image horizontally */

                height: 100%;
            }

            .image-container img {
                max-width: 100%; /* limit the width of the image to fit its container */
                max-height: 100%; /* limit the height of the image to fit its container */
            }
        </style>
        <div class="image-container">
            <img src="images/souslesensVocables.png" />
        </div>
    `;
}

customElements.define("sls-credit-image", component(CreditImage, { useShadowDOM: true }));
