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

    if (!this.state.gameHistory || this.state.gameHistory.length === 0) {
      historyContainer.innerHTML = `<p class="text-center neon-text-blue">No game history</p>`;
      return;
    }

    // 全ゲーム履歴データをコンソールに出力（デバッグ用）
    console.log("全ゲーム履歴データ:", this.state.gameHistory);

    historyContainer.innerHTML = this.state.gameHistory
      .map((game, index) => {
        // 日付の処理
        let dateDisplay = "";
        if (game.played_at) {
          try {
            const date = new Date(game.played_at);
            if (!isNaN(date)) {
              dateDisplay = date.toLocaleDateString();
            }
          } catch (e) {
            console.error("Date parsing error:", e);
          }
        }

        // デバッグログ
        console.log(`Game ${index} (ID: ${game.id}):`);
        console.log("  Mode:", game.mode);
        console.log("  Player Count:", game.player_count);
        console.log("  User:", game.user_nickname, game.user_score);

        // プレイヤー情報のデバッグ
        for (let i = 1; i <= 4; i++) {
          if (game[`player${i}_nickname`]) {
            console.log(
              `  Player ${i}:`,
              game[`player${i}_nickname`],
              game[`player${i}_score`],
              game[`player${i}_id`]
            );
          }
        }

        // トーナメント表示の場合
        if (game.is_tournament) {
          // トーナメント名
          let tournamentName = game.name || "Tournament";

          // 参加者データの取得（シンプル化）
          let participants = [];

          // participant_nicknames配列を優先使用（バックエンドで追加したもの）
          if (Array.isArray(game.participant_nicknames)) {
            participants = [...game.participant_nicknames];
            console.log("Using participant_nicknames:", participants);
          }
          // 次にparticipants配列を使用（オブジェクト配列の場合）
          else if (
            Array.isArray(game.participants) &&
            game.participants.length > 0
          ) {
            participants = game.participants.map((p) => p.nickname);
            console.log("Using participants array:", participants);
          }

          // 優勝者を参加者リストから除外
          const displayParticipants = game.winner_nickname
            ? participants.filter((name) => name !== game.winner_nickname)
            : participants;

          console.log("Final participants to display:", displayParticipants);

          return `
            <div class="game-history-item">
              <div class="history-badge"></div>
              <div class="history-main">
                <div class="history-title">${tournamentName}
                <span class="history-date">${dateDisplay}</span>
                </div>
                <div class="history-result">
                  ${
                    game.winner_nickname
                      ? `<div class="tournament-winner">
                           <img src="${
                             game.winner_avatar ||
                             "/static/pong/images/avatar-default.jpg"
                           }" 
                                alt="Winner" class="avatar-mini"> 
                           <span class="player-name">${
                             game.winner_nickname
                           }</span>
                           <span class="trophy-icon">🏆</span>
                         </div>`
                      : "<span class='tournament-status'>IN PROGRESS</span>"
                  }
                  
                  ${
                    displayParticipants.length > 0
                      ? `<div class="tournament-participants">
                           <span class="participants-label">Players: </span>
                           ${displayParticipants.join(", ")}
                         </div>`
                      : ""
                  }
                </div>
              </div>
            </div>
          `;
        }

        // 通常ゲーム表示
        const gameMode = game.mode || "Local";
        const playerCount = game.player_count || 2;
        const isFourPlayerGame = playerCount >= 4;

        // 4人プレイの場合
        if (isFourPlayerGame) {
          // 各プレイヤー情報を配列に格納
          const players = [];

          // 各プレイヤーの情報をプレイヤー番号順に格納
          for (let i = 1; i <= 4; i++) {
            let playerData = {
              name: game[`player${i}_nickname`] || `Player ${i}`,
              score: game[`player${i}_score`] || 0,
              avatar:
                game[`player${i}_avatar`] ||
                "/static/pong/images/avatar-default.jpg",
              id: game[`player${i}_id`] || null,
              isUser: game[`player${i}_id`] === (game.user_id || null),
            };

            // ユーザー自身の場合はstate.avatarを使用
            if (
              i === game.user_player_number ||
              game[`player${i}_id`] === game.user_id ||
              game[`player${i}_nickname`] === game.user_nickname
            ) {
              playerData.avatar =
                this.state.avatar || "/static/pong/images/avatar-default.jpg";
              playerData.isUser = true;
            }

            players.push(playerData);
          }

          console.log("プレイヤー配列:", players);

          return `
            <div class="game-history-item four-player">
              <div class="history-badge"></div>
              <div class="history-main">
                <div class="history-title">${gameMode} 4P <span class="history-date">${dateDisplay}</span></div>
                <div class="match-wrapper">
                  <!-- 第1試合：Player 1 vs Player 2 -->
                  <div class="match-row">
                    <div class="player-info">
                      <img src="${
                        players[0]?.avatar ||
                        "/static/pong/images/avatar-default.jpg"
                      }" alt="P1" class="avatar-mini">
                      <span class="player-name">${
                        players[0]?.name || "Player 1"
                      }</span>
                    </div>
                    <div class="score-display">
                      <span>${players[0]?.score || 0}</span>
                      <span>&nbsp;-&nbsp;</span>
                      <span>${players[1]?.score || 0}</span>
                    </div>
                    <div class="player-info">
                      <img src="${
                        players[1]?.avatar ||
                        "/static/pong/images/avatar-default.jpg"
                      }" alt="P2" class="avatar-mini">
                      <span class="player-name">${
                        players[1]?.name || "Player 2"
                      }</span>
                    </div>
                  </div>
                  
                  <!-- 第2試合：Player 3 vs Player 4 -->
                  <div class="match-row">
                    <div class="player-info">
                      <img src="${
                        players[2]?.avatar ||
                        "/static/pong/images/avatar-default.jpg"
                      }" alt="P3" class="avatar-mini">
                      <span class="player-name">${
                        players[2]?.name || "Player 3"
                      }</span>
                    </div>
                    <div class="score-display">
                      <span>${players[2]?.score || 0}</span>
                      <span>&nbsp;-&nbsp;</span>
                      <span>${players[3]?.score || 0}</span>
                    </div>
                    <div class="player-info">
                      <img src="${
                        players[3]?.avatar ||
                        "/static/pong/images/avatar-default.jpg"
                      }" alt="P4" class="avatar-mini">
                      <span class="player-name">${
                        players[3]?.name || "Player 4"
                      }</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        } else {
          // 2人プレイの場合
          return `
            <div class="game-history-item">
              <div class="history-badge"></div>
              <div class="history-main">
                <div class="history-title">${gameMode} 2P <span class="history-date">${dateDisplay}</span></div>
                <div class="players-container">
                  <div class="player-info">
                    <img src="${
                      this.state.avatar ||
                      "/static/pong/images/avatar-default.jpg"
                    }" 
                         alt="You" class="avatar-mini">
                    <span class="player-name">${
                      game.user_nickname || "You"
                    }</span>
                  </div>
                  <div class="score">
                    ${game.user_score || 0} &nbsp;-&nbsp; ${
            game.opponent_score || 0
          }
                  </div>
                  <div class="player-info">
                    <img src="${
                      game.opponent_avatar ||
                      "/static/pong/images/avatar-default.jpg"
                    }" 
                         alt="Opponent" class="avatar-mini">
                    <span class="player-name">${
                      game.opponent || "Opponent"
                    }</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        }
      })
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
      const stateToPass = {
        username: this.state.username,
        avatar: this.state.avatar,
      };
      this.goNextPage("/online-matching", stateToPass);
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
    <div class="container py-5 d-flex flex-column justify-content-center align-items-center">
      <!-- 上部：プロフィールとゲーム履歴 -->
      <div class="row w-100 mb-4">
        <!-- 左側：プロフィール情報 -->
        <div class="col-lg-4 mb-4 mb-lg-0 d-flex">
          <div class="user-profile p-4 text-center w-100">
            <div class="avatar-container mb-3">
              <img src="${this.state.avatar}" alt="Avatar" class="player-profile-avatar">
            </div>
            <h2 class="neon-text mb-3">${this.state.username}</h2>
            <div class="mt-3 d-flex flex-column gap-2">
              <button id="edit-profile-button" class="neon-btn d-flex justify-content-center align-items-center">EDIT PROFILE</button>
              <button id="friend-list-button" class="neon-btn d-flex justify-content-center align-items-center">FRIENDS</button>
              <button id="logout-button" class="neon-btn d-flex justify-content-center align-items-center">LOGOUT</button>
            </div>
          </div>
        </div>
        
        <!-- 右側：ゲーム履歴 -->
        <div class="col-lg-8 d-flex">
          <div class="game-history-container p-4 w-100" style="max-height: 497px; overflow-y: auto;">
            <h3 class="neon-text-blue mb-3">GAME HISTORY</h3>
            <div id="game-history" class="game-history-list"></div>
          </div>
        </div>
      </div>
      
      <!-- 下部：ゲームメニュー -->
      <div class="row w-100">
        <div class="col-12">
          <div class="game-menu p-4 text-center">
            <h3 class="neon-text-blue mb-4">GAME MENU</h3>
            <div class="d-flex justify-content-center align-items-center gap-4">
              <button id="local-game-button" class="neon-btn btn-lg d-flex justify-content-center align-items-center">LOCAL GAME</button>
              <button id="online-game-button" class="neon-btn btn-lg d-flex justify-content-center align-items-center">ONLINE GAME</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
  }
}
