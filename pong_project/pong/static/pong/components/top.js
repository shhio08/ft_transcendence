import { Component } from "../core/component.js";

export class Top extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.render();
        this.findElement("go-login").onclick = () => {
            this.goLogin();
        };
    }

    goLogin() {
        this.goNextPage("/login");
    }

    get html() {
        return `
            <h1>Welcome to the Pong Game!</h1>
            <p>This is the top page.</p>
            <button id="go-login">Go to Login</button>
        `;
    }
}
