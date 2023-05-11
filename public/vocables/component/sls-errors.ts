import { html } from "haunted";
import { StoreController } from "@nanostores/lit";
import { errors } from "../store/errors";
import { LitElement } from "lit";

class Errors extends LitElement {
    private profileController = new StoreController(this, errors);
    render() {
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
                        <td><span class="messageDiv" id="messageDiv">${this.profileController.value[0]}</span></td>
                    </tr>
                </table>
            </div>`;
    }
}
customElements.define("sls-errors", Errors);
