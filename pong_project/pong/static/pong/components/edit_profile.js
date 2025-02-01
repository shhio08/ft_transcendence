import { Component } from "../core/component.js";

export class EditProfile extends Component {
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
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                this.state.username = data.user.username || '';
                this.state.avatar = data.user.avatar || '';
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
        this.findElement("save-button").onclick = () => {
            this.saveUserData();
        };
        this.findElement("cancel-button").onclick = () => {
            this.goNextPage('/home');
        };
    }

    saveUserData() {
        const token = localStorage.getItem('authToken');
        const formData = new FormData();
        formData.append('username', this.findElement("username-input").value);
        const avatarFile = this.findElement("avatar-input").files[0];
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        fetch('/pong/api/update-user-info/', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('User data updated successfully');
                this.goNextPage('/home');
            } else {
                console.log(data.message);
            }
        })
        .catch(error => {
            console.error('Error updating user data:', error);
        });
    }

    get html() {
        return `
            <h1>Edit Profile</h1>
            <label for="username-input">Username:</label>
            <input id="username-input" type="text" value="${this.state.username}">
            
            <label for="avatar-input">Avatar:</label>
            ${this.state.avatar ? 
                `<img src="${this.state.avatar}" alt="Current Avatar" style="max-width: 100px; max-height: 100px;">` :
                `<p>No avatar set</p>`
            }
            <input id="avatar-input" type="file">
            
            <button id="save-button">Save</button>
            <button id="cancel-button">Cancel</button>
        `;
    }
} 