import { Component } from "../core/component.js";

export class Home extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.render();
        this.findElement("logout-button").onclick = () => {
            this.handleLogout();
        };
    }

    handleLogout() {
        fetch('/pong/api/logout/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log(data.message);
                this.goNextPage('/login');
            } else {
                console.log(data.message);
            }
        })
        .catch(error => {
            console.log(error);
        });
    }

    get html() {
        return `
            <h1>Home</h1>
            <p>Welcome to your home page!</p>
            <button id="logout-button">Logout</button>
        `;
    }
}