import { Component } from "../core/component.js";

export class Signup extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.render();
        this.findElement("signup-form").onsubmit = (event) => {
            event.preventDefault();
            this.handleSignup();
        };
    }

    handleSignup() {
		const formData = new FormData();
		formData.append('username', this.findElement("username").value);
		formData.append('email', this.findElement("email").value);
		formData.append('password', this.findElement("password").value);

		const avatarFile = this.findElement("avatar").files[0];
		if (avatarFile) {
			formData.append('avatar', avatarFile);
		}

		fetch('/pong/api/signup/', {
			method: 'POST',
			body: formData,
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
            <h1>Sign Up</h1>
            <form id="signup-form">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
                <br>
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
                <br>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
                <br>
                <label for="avatar">Avatar:</label>
                <input type="file" id="avatar" name="avatar">
                <br>
                <button type="submit">Sign Up</button>
            </form>
        `;
    }
} 