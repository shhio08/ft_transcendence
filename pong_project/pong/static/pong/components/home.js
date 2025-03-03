import { Component } from "../core/component.js";

export class Home extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.loadUserData();
  }

  loadUserData() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found");
      this.goNextPage("/login");
      return;
    }

    fetch("/pong/api/user-info/", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch user info");
        }
        return response.json();
      })
      .then((data) => {
        if (data.status === "success") {
          // console.log("API response data:", data);
          // console.log("API response avatar data:", data.user.avatar);
          this.state.username = data.user.username || "Guest";
          this.state.avatar =
            data.user.avatar || "/static/pong/images/avatar-default.jpg";
          console.log("success username: " + this.state.username);
          console.log("success avatar: " + this.state.avatar);
          this.render();
          this.attachEventListeners();
          this.loadGameHistory();
        } else {
          console.log(data.message);
          this.goNextPage("/login");
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        this.goNextPage("/login");
      });
  }

  loadGameHistory() {
    const token = localStorage.getItem("authToken");
    fetch("/pong/api/user-game-history/", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch game history");
        }
        return response.json();
      })
      .then((data) => {
        this.state.gameHistory = data.game_history || [];
        this.renderGameHistory();
      })
      .catch((error) => {
        console.error("Error fetching game history:", error);
      });
  }

  attachEventListeners() {
    this.findElement("logout-button").onclick = () => {
      this.handleLogout();
    };
    this.findElement("start-game-button").onclick = () => {
      this.goNextPage("/game");
    };
    this.findElement("edit-profile-button").onclick = () => {
      this.goNextPage("/edit-profile");
    };
    this.findElement("friend-list-button").onclick = () => {
      this.goNextPage("/friend-list");
    };
  }
  renderGameHistory() {
    const historyContainer = this.findElement("game-history");
    historyContainer.innerHTML = this.state.gameHistory
      .map(
        (game) => `
          <div>
            <p>Mode: ${game.mode}</p>
            <p>
              <img src="${
                game.user_avatar || "/static/pong/images/avatar-default.jpg"
              }" alt="Your Avatar" style="width: 50px; height: 50px;">
              ${game.user_nickname}: ${game.user_score} - 
              <img src="${
                game.opponent_avatar || "/static/pong/images/avatar-default.jpg"
              }" alt="Opponent Avatar" style="width: 50px; height: 50px;">
              ${game.opponent}: ${game.opponent_score}
            </p>
          </div>
        `
      )
      .join("");
  }

  attachEventListeners() {
    this.findElement("logout-button").onclick = () => {
      this.handleLogout();
    };
    this.findElement("local-game-button").onclick = () => {
      const stateToPass = { username: this.state.username };
      this.goNextPage("/local-game-options", stateToPass);
    };
    this.findElement("online-game-button").onclick = () => {
      // TODO: オンラインゲームのボタンを実装
      console.log("Online game button clicked");
    };
    this.findElement("edit-profile-button").onclick = () => {
      this.goNextPage("/edit-profile");
    };
  }

  handleLogout() {
    console.log("handleLogout");
    const token = localStorage.getItem("authToken");
    fetch("/pong/api/logout/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log(data.message);
          localStorage.removeItem("authToken");
          this.goNextPage("/");
        } else {
          console.log(data.message);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }

  get html() {
    return `
            <h1>Home</h1>
            <p>Welcome, ${this.state.username}!</p>
            <img src="${this.state.avatar}" alt="Avatar" style="width: 100px; height: 100px;">
            <button id="logout-button">Logout</button>
            <button id="local-game-button">Local Game</button>
            <button id="online-game-button">Online Game</button>
            <button id="edit-profile-button">Edit Profile</button>
            <button id="friend-list-button">Friend List</button>
            <div id="game-history"></div>
        `;
  }
}
