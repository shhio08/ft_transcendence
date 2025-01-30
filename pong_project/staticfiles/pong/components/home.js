import { Component } from "../core/component.js";

export class Home extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.render();
    }

    get html() {
        return `
            <h1>Home</h1>
            <p>Welcome to your home page!</p>
        `;
    }
}