import { Component } from "../core/component.js";

export class Top extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.render();
        this.findElement("go-login").onclick = () => {
            this.goLogin();
        };
        this.findElement("go-signup").onclick = () => {
            this.goSignup();
        };
    }

    goLogin() {
        this.goNextPage("/login");
    }

    goSignup() {
        this.goNextPage("/signup");
    }

    get html() {
        return `
            <h1>Welcome to the Pong Game!</h1>
            <p>This is the top page.</p>
            <button id="go-login">Go to Login</button>
            <button id="go-signup">Sign Up</button>
        `;
    }
}
