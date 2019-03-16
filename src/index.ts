import {App} from "app/app.js";
import * as React from "react";
import {render} from "react-dom";



const container = document.createElement("div");
document.body.appendChild(container);

render(React.createElement(App), container);

