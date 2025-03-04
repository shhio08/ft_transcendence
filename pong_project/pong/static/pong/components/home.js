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

  renderGameHistory() {
    const historyContainer = this.findElement("game-history");

    // デバッグ用：日付データの確認
    console.log("Game history data sample:", this.state.gameHistory[0]);

    historyContainer.innerHTML = this.state.gameHistory
      .map((game) => {
        // ゲームモードを取得
        const gameMode = game.mode || "local";

        // プレイヤー数を確認
        const playerCount = game.player_count || 2;
        const isFourPlayerGame = playerCount >= 4;

        // 日付の処理 - played_atがない場合は表示しない
        let dateDisplay = "";
        if (game.played_at) {
          try {
            const date = new Date(game.played_at);
            // 有効な日付かチェック
            if (!isNaN(date)) {
              dateDisplay = date.toLocaleDateString();
            }
          } catch (e) {
            console.error("Date parsing error:", e);
          }
        }

        // コンパクトに表示するHTMLを生成
        return `
          <div class="game-history-item">
            <div class="game-header">
              <span class="game-mode">${gameMode}${
          isFourPlayerGame ? " (4P)" : " (2P)"
        }</span>
              <span class="game-date">${dateDisplay}</span>
            </div>
            
            <div class="players-container">
              <!-- 1行目のプレイヤー (常に表示) -->
              <div class="player-row">
                <div class="player">
                  <img src="${
                    game.user_avatar || "/static/pong/images/avatar-default.jpg"
                  }" 
                       alt="P1" class="player-avatar">
                  <span class="player-info">${game.user_nickname}: ${
          game.user_score
        }</span>
                </div>
                <span class="vs">vs</span>
                <div class="player">
                  <img src="${
                    game.opponent_avatar ||
                    "/static/pong/images/avatar-default.jpg"
                  }" 
                       alt="P2" class="player-avatar">
                  <span class="player-info">${game.opponent}: ${
          game.opponent_score
        }</span>
                </div>
              </div>
              
              <!-- 2行目のプレイヤー (4人プレイの場合のみ) -->
              ${
                isFourPlayerGame
                  ? `
              <div class="player-row">
                <div class="player">
                  <img src="${
                    game.player3_avatar ||
                    "/static/pong/images/avatar-default.jpg"
                  }" 
                       alt="P3" class="player-avatar">
                  <span class="player-info">${game.player3_nickname}: ${
                      game.player3_score
                    }</span>
                </div>
                <span class="vs">vs</span>
                <div class="player">
                  <img src="${
                    game.player4_avatar ||
                    "/static/pong/images/avatar-default.jpg"
                  }" 
                       alt="P4" class="player-avatar">
                  <span class="player-info">${game.player4_nickname}: ${
                      game.player4_score
                    }</span>
                </div>
              </div>
              `
                  : ""
              }
            </div>
          </div>
        `;
      })
      .join("");

    // スタイルを追加
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .game-history-item {
        margin-bottom: 10px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 5px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        background-color: #ffffff;
      }
      .game-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: #666;
        margin-bottom: 5px;
      }
      .game-mode {
        font-weight: bold;
      }
      .players-container {
        display: flex;
        flex-direction: column;
      }
      .player-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .player {
        display: flex;
        align-items: center;
        flex: 1;
      }
      .player-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        margin-right: 5px;
      }
      .player-info {
        font-size: 0.9rem;
      }
      .vs {
        font-weight: bold;
        margin: 0 5px;
        font-size: 0.8rem;
        color: #888;
      }
    `;
    document.head.appendChild(styleElement);
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

    // friend-list-buttonのイベントリスナーを追加
    const friendListBtn = this.findElement("friend-list-button");
    if (friendListBtn) {
      friendListBtn.onclick = () => {
        this.goNextPage("/friend-list");
      };
    }
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
