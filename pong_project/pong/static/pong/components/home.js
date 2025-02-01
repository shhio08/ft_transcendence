import { Component } from "../core/component.js";

export class Home extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.loadUserData();
    }

    loadUserData() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            this.goNextPage('/login');
            return;
        }

        fetch('/pong/api/user-info/', {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                // console.log("API response data:", data);
                // console.log("API response avatar data:", data.user.avatar);
                this.state.username = data.user.username || 'Guest';
                this.state.avatar = data.user.avatar || '/static/pong/images/avatar-default.jpg';
                console.log("success username: " + this.state.username);
                console.log("success avatar: " + this.state.avatar);
                this.render();
                this.attachEventListeners();
            } else {
                console.log(data.message);
                this.goNextPage('/login');
            }
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            this.goNextPage('/login');
        });
    }

    attachEventListeners() {
        this.findElement("logout-button").onclick = () => {
            this.handleLogout();
        };
        this.findElement("start-game-button").onclick = () => {
            this.goNextPage('/game');
        };
    }

    handleLogout() {
        console.log('handleLogout');
        const token = localStorage.getItem('authToken');
        fetch('/pong/api/logout/', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log(data.message);
                localStorage.removeItem('authToken');
                this.goNextPage('/');
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
            <p>Welcome, ${this.state.username}!</p>
            <img src="${this.state.avatar}" alt="Avatar" style="width: 100px; height: 100px;">
            <button id="logout-button">Logout</button>
            <button id="start-game-button">Start Game</button>
        `;
    }
}