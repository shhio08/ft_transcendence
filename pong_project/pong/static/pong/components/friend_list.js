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
        // fetch('/pong/api/friend-list/', {
        fetch('/pong/api/friend-list/', {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            // console.log('data');
            // console.log(data);
            if (data.status === 'success') {
                console.log('data');
                console.log(data.friend_list);
                console.log(data.friend_request_list);
                this.renderFriendList(data.friend_list); // 友達リストを表示するメソッドを呼び出す
                this.renderRequestList(data.friend_request_list); // 友達リクエストを表示するメソッドを呼び出す
                this.attachEventListeners();
            }
            else {
                console.log(data.message);
                this.goNextPage('/home'); // エラー時にホームに戻る
            }
        })
        .catch(error => {
            console.error('Error fetching friend data:', error);
            this.goNextPage('/home'); // エラー時にホームに戻る
        });
        // ユーザ一覧を取得
        fetch('/pong/api/user-list/', {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            console.log('data');
            console.log(data);
            if (data.status === 'success') {
                this.renderUserList(data.user_list); // 友達リストを表示するメソッドを呼び出す
            }
            else {
                console.log(data.message);
                this.goNextPage('/home'); // エラー時にホームに戻る
            }
        })
        .catch(error => {
            console.error('Error fetching friend data:', error);
            this.goNextPage('/home'); // エラー時にホームに戻る
        });
    }

    renderUserList(users) {
        // 友達リストをHTMLに追加する処理
        if (users) {
            // console.log(users);
            const userListHtml = Object.keys(users).map(key => {
                const user = users[key];
                return `<li id=${key}>${user.username}<button id=${key}>Add</button></li>\n`; // ユーザ名とメールを表示
            }).join('');
            const list = document.getElementById("user-list");
            list.innerHTML += userListHtml;
        }
    }
    renderFriendList(friends) {
        // 友達リストをHTMLに追加する処理
        if (friends) {
            console.log('friends');
            console.log(friends);
            const friendListHtml = Object.keys(friends).map(key => {
                const friend = friends[key];
                return `<li id=${key}>${friend.username}: ${friend.status}</li>\n`; // ユーザ名とメールを表示
            }).join('');
            const list = document.getElementById("friend-list");
            list.innerHTML += friendListHtml;
        }
    }

    renderRequestList(requests) {
        console.log('requests');
        console.log(requests);
        const requestListHtml = Object.keys(requests).map(key => {
            const request = requests[key];
            return `<li id=${key}>${request.username}<button id=${key}>Accept</button></li>\n`; // ユーザ名とボタンを表示
        }).join('');
        const list = document.getElementById("friend-request");
        list.innerHTML += requestListHtml;
    }

    attachEventListeners() {
        this.findElement("go-home").onclick = () => {
            this.goNextPage('/home');
        };
        // 友達リクエストのボタンにイベントリスナーを追加
        const requestButtons = document.querySelectorAll('#friend-request button');
        requestButtons.forEach(button => {
            button.onclick = () => {
                this.handleFriendRequest(button.id);
            };
        });
        const addButtons = document.querySelectorAll('#user-list button');
        addButtons.forEach(button => {
            button.onclick = () => {
                this.handleAddFriend(button.id);
            };
        });
    }

    handleAddFriend(friendId) {
        // 友達にリクエストを送信するAPIを呼び出す
        const token = localStorage.getItem('authToken');
        console.log("friendId");
        console.log(friendId);
        const formData = new FormData();
        formData.append('friend_id', friendId);
        fetch('/pong/api/add-friend/', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                // bodyにFormDataを使う場合はContent-Typeを指定するとエラーになる
                // 'Content-Type': 'application/json',
            },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to accept friend request');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                console.log(data.message);
                this.goNextPage('/friend-list');
            } else {
                console.log(data.message);
            }
        })
        .catch(error => {
            console.error('Error accepting friend request:', error);
        });
    }

    handleFriendRequest(friendId) {
        // 友達リクエストを承認するAPIを呼び出す
        const token = localStorage.getItem('authToken');
        console.log("handleFriendRequest: friendId");
        console.log(friendId);
        const formData = new FormData();
        formData.append('friend_id', friendId);
        fetch('/pong/api/accept-friend/', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                // 'Content-Type': 'application/json',
            },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to accept friend request');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                console.log("handleFriendRequest success");
                console.log(data.message);
                this.goNextPage('/friend-list');
            } else {
                console.log(data.message);
            }
        })
        .catch(error => {
            console.error('Error accepting friend request:', error);
        });
    }

    get html() {
        return `
            <h1>Friend Page</h1>
            <h2>Friend List</h2>
            <ul id="friend-list">
            </ul>

            <h2>Friend Request</h2>
            <ul id="friend-request">
            </ul>

            <h2 id="user-list">User List</h2>
            <ul id="user-list">
            </ul>
            <button id="go-home">Go to Home</button>
        `;
    }
}