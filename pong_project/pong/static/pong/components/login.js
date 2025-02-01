import { Component } from "../core/component.js";

export class Login extends Component {
    constructor(router, params, state) {
        super(router, params, state);
		this.render();
        this.findElement("login-form").onsubmit = (event) => {
            event.preventDefault();
            this.handleLogin();
        };
    }

	handleLogin() {
		const username = this.findElement("username").value;
		const password = this.findElement("password").value;
		fetch('/pong/api/login/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, password }),
		})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				console.log(data.message);
				localStorage.setItem('authToken', data.token);
				this.goNextPage('/home');
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
            <h1>Login</h1>
            <form id="login-form">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
                <br>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
                <br>
                <button type="submit">Login</button>
            </form>
        `;
    }
}