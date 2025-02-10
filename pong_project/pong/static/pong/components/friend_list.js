import { Component } from "../core/component.js";

export class FriendList extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        // this.loadUserData();
    }

    attachEventListeners() {
        this.findElement("go-home").onclick = () => {
            this.goNextPage('/home');
        };
    }
    get html() {
        return `
            <h1>Friend List</h1>
            <p>This is the friend list page.</p>
            <button id="go-home">Go to Home</button>
        `;
    }
}