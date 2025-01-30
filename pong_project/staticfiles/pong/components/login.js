import { Component } from "../core/component.js";

export class Login extends Component {
    constructor(router, params, state) {
        super(router, params, state);
		this.render();
        this.findElement("login-form").onsubmit = (event) => {
            event.preventDefault();
            this.handleLogin();
        };
        this.loadUserCount();  // ユーザー数をロード
    }

    loadUserCount() {
        fetch('/pong/api/user-count/', {
            method: 'GET',  // 明示的にGETメソッドを指定
        })
        .then(response => response.json())
        .then(data => {
            const userCountElement = this.findElement("user-count");
            userCountElement.textContent = `User Count: ${data.user_count}`;
        })
        .catch(error => {
            console.log('Error loading user count:', error);
        });
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
				// console.log(data.message);
				console.log(data.status);
			} else {
				// console.log(data.message);
				console.log(data.status);
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
            <h2 id="user-count">User Count: Loading...</h2>  <!-- ユーザー数を表示 -->
        `;
    }
}