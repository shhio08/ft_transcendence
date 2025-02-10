import { Component } from "../core/component.js";

export class FriendList extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.loadUserData(); // ユーザデータをロードするメソッドを呼び出す
    }

    loadUserData() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            this.goNextPage('/login');
            return;
        }

        // 友達リストを取得するAPIを呼び出す
        fetch('/pong/api/friend-list/', {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch friend list');
            }
            console.log('response');
            return response.json();
        })
        .then(data => {
            console.log('data');
            console.log(data);
            if (data.status === 'success') {
                this.state.username = data.user.username || '';
                this.render();
                this.attachEventListeners();
                // this.renderUserList(data.friends); // 友達リストを表示するメソッドを呼び出す
            } else {
                console.log(data.message);
                this.goNextPage('/home'); // エラー時にホームに戻る
            }
        })
        .catch(error => {
            console.error('Error fetching friend data:', error);
            this.goNextPage('/home'); // エラー時にホームに戻る
        });
    }

    renderUserList(friends) {
        // 友達リストをHTMLに追加する処理
        const friendListHtml = friends.map(friend => `<li>${friend.username}</li>`).join('');
        this.findElement('friend-list').innerHTML = `<ul>${friendListHtml}</ul>`;
        this.render();
        this.attachEventListeners();
    }

    attachEventListeners() {
        this.findElement("go-home").onclick = () => {
            this.goNextPage('/home');
        };
    }

    get html() {
        return `
            <h1>Friend List</h1>
            <p>This is the test list page.</p>

            <input id="friend-list" type="text" value="${this.state.username}">

            <button id="go-home">Go to Home</button>
        `;
    }
}