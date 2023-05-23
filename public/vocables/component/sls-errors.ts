import { html, component } from "haunted";
import { useStore } from "@nanostores/preact";
import { errors } from "../store/errors";

function Errors() {
    const value = useStore(errors);

    return html` <style>
            .messageDiv {
                font-weight: normal;
                font-size: 12px;
                color: white;
                background-color: #00a37f;
                padding: 2px;
                margin: 2px;
                height: 30px;
                overflow: auto;
            }
        </style>

        <div>
            <table>
                <tr>
                    <td><img src="./images/waitAnimated.gif" id="waitImg" style="display: none; width: 15px; text-align: justify" /></td>
                    <td><span class="messageDiv" id="messageDiv">${value[0]}</span></td>
                </tr>
            </table>
        </div>`;
}
customElements.define("sls-errors", component(Errors));
