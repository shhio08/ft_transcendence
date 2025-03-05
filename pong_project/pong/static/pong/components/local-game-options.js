import { Component } from "../core/component.js";

export class LocalGameOptions extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.state = {
      mode: "local",
      gameType: "match", // "match" または "tournament"
      players: 2,
      ball_count: 1,
      ball_speed: "normal",
      nicknames: [
        this.state.username || "Player 1",
        "Player 2",
        "Player 3",
        "Player 4",
      ],
    };
    this.render();
    this.attachEventListeners();
    this.renderNicknames();
  }

  attachEventListeners() {
    // ゲームタイプ選択
    this.findElement("game-type-select").onchange = (e) => {
      this.state.gameType = e.target.value;
      this.updatePlayerOptions();
      this.renderNicknames();
    };

    this.findElement("players-2-button").onclick = () => {
      this.state.players = 2;
      this.updatePlayerButtons();
      this.renderNicknames();
    };

    this.findElement("players-4-button").onclick = () => {
      this.state.players = 4;
      this.updatePlayerButtons();
      this.renderNicknames();
    };

    this.findElement("ball-count-1-button").onclick = () => {
      this.state.ball_count = 1;
      this.updateBallCountButtons();
    };

    this.findElement("ball-count-2-button").onclick = () => {
      this.state.ball_count = 2;
      this.updateBallCountButtons();
    };

    this.findElement("ball-speed-slow-button").onclick = () => {
      this.state.ball_speed = "slow";
      this.updateBallSpeedButtons();
    };

    this.findElement("ball-speed-normal-button").onclick = () => {
      this.state.ball_speed = "normal";
      this.updateBallSpeedButtons();
    };

    this.findElement("ball-speed-fast-button").onclick = () => {
      this.state.ball_speed = "fast";
      this.updateBallSpeedButtons();
    };

    this.findElement("home-button").onclick = () => {
      this.goNextPage("/home");
    };

    this.findElement("start-game-button").onclick = () => {
      if (this.state.gameType === "tournament") {
        this.createTournament();
      } else {
        this.createGame();
      }
    };
  }

  // 新規追加：プレイヤー選択オプションの更新
  updatePlayerOptions() {
    if (this.state.gameType === "tournament") {
      // トーナメントモードの場合は4人に固定
      this.state.players = 4;

      // ボタンの状態を更新
      const twoPlayersBtn = this.findElement("players-2-button");
      const fourPlayersBtn = this.findElement("players-4-button");

      twoPlayersBtn.style.opacity = "0.5";
      twoPlayersBtn.disabled = true;
      fourPlayersBtn.style.opacity = "1.0";

      // トーナメント情報を表示
      const tournamentInfo = this.findElement("tournament-info");
      if (tournamentInfo) {
        tournamentInfo.style.display = "block";
      }
    } else {
      // マッチモードの場合は2人を初期値に
      this.state.players = 2;

      // ボタンの状態をリセット
      const twoPlayersBtn = this.findElement("players-2-button");
      const fourPlayersBtn = this.findElement("players-4-button");

      twoPlayersBtn.style.opacity = "1.0";
      twoPlayersBtn.disabled = false;
      fourPlayersBtn.style.opacity = "0.5";

      // トーナメント情報を非表示
      const tournamentInfo = this.findElement("tournament-info");
      if (tournamentInfo) {
        tournamentInfo.style.display = "none";
      }
    }

    this.updatePlayerButtons();
  }

  updatePlayerButtons() {
    const twoPlayersBtn = this.findElement("players-2-button");
    const fourPlayersBtn = this.findElement("players-4-button");

    if (this.state.gameType === "tournament") {
      // トーナメントモードでは2人プレイは選択不可
      twoPlayersBtn.style.opacity = "0.5";
      twoPlayersBtn.disabled = true;
      fourPlayersBtn.style.opacity = "1.0";
    } else {
      // 通常モードでは両方選択可能
      twoPlayersBtn.disabled = false;

      if (this.state.players === 2) {
        twoPlayersBtn.style.opacity = "1.0";
        fourPlayersBtn.style.opacity = "0.5";
      } else {
        twoPlayersBtn.style.opacity = "0.5";
        fourPlayersBtn.style.opacity = "1.0";
      }
    }
  }

  updateBallCountButtons() {
    const ballCount1Btn = this.findElement("ball-count-1-button");
    const ballCount2Btn = this.findElement("ball-count-2-button");

    if (this.state.ball_count === 1) {
      ballCount1Btn.style.opacity = "1.0";
      ballCount2Btn.style.opacity = "0.5";
    } else {
      ballCount1Btn.style.opacity = "0.5";
      ballCount2Btn.style.opacity = "1.0";
    }
  }

  updateBallSpeedButtons() {
    const slowBtn = this.findElement("ball-speed-slow-button");
    const normalBtn = this.findElement("ball-speed-normal-button");
    const fastBtn = this.findElement("ball-speed-fast-button");

    slowBtn.style.opacity = "0.5";
    normalBtn.style.opacity = "0.5";
    fastBtn.style.opacity = "0.5";

    switch (this.state.ball_speed) {
      case "slow":
        slowBtn.style.opacity = "1.0";
        break;
      case "normal":
        normalBtn.style.opacity = "1.0";
        break;
      case "fast":
        fastBtn.style.opacity = "1.0";
        break;
    }
  }

  renderNicknames() {
    const nicknamesContainer = this.findElement("nicknames-container");
    nicknamesContainer.innerHTML = "";

    // 現在のプレイヤー数
    const playerCount = this.state.players;

    if (playerCount === 2) {
      // 2人の場合は1行に2つ
      const row = document.createElement("div");
      row.className = "row nickname-row";

      for (let i = 0; i < 2; i++) {
        const col = document.createElement("div");
        col.className = "col-6 mb-2";

        col.innerHTML = `
          <div class="input-group input-group-sm">
            <span class="input-group-text">P${i + 1}</span>
            <input type="text" class="form-control neon-input" 
                  value="${this.state.nicknames[i]}" 
                  id="nickname-${i}">
          </div>
        `;

        row.appendChild(col);
      }

      nicknamesContainer.appendChild(row);
    } else {
      // 4人の場合は2行×2列
      const row1 = document.createElement("div");
      row1.className = "row nickname-row mb-2";

      const row2 = document.createElement("div");
      row2.className = "row nickname-row";

      // 上の行: プレイヤー1と2
      for (let i = 0; i < 2; i++) {
        const col = document.createElement("div");
        col.className = "col-6";

        col.innerHTML = `
          <div class="input-group input-group-sm">
            <span class="input-group-text">P${i + 1}</span>
            <input type="text" class="form-control neon-input" 
                  value="${this.state.nicknames[i]}" 
                  id="nickname-${i}">
          </div>
        `;

        row1.appendChild(col);
      }

      // 下の行: プレイヤー3と4
      for (let i = 2; i < 4; i++) {
        const col = document.createElement("div");
        col.className = "col-6";

        col.innerHTML = `
          <div class="input-group input-group-sm">
            <span class="input-group-text">P${i + 1}</span>
            <input type="text" class="form-control neon-input" 
                  value="${this.state.nicknames[i]}" 
                  id="nickname-${i}">
          </div>
        `;

        row2.appendChild(col);
      }

      nicknamesContainer.appendChild(row1);
      nicknamesContainer.appendChild(row2);
    }
  }

  // 通常の試合作成処理
  createGame() {
    const nicknames = [];
    for (let i = 0; i < this.state.players; i++) {
      nicknames.push(this.findElement(`nickname-${i}`).value);
    }

    fetch("/pong/api/create-game/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: this.state.mode,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "Game created successfully") {
          this.createGameOptions(data.id, () => {
            this.createPlayers(data.id, nicknames);
          });
        } else {
          console.error("Error creating game:", data.error);
        }
      })
      .catch((error) => {
        console.error("Error creating game:", error);
      });
  }

  // 新規追加：トーナメント作成処理
  createTournament() {
    // ニックネームを取得
    const nicknames = [];
    for (let i = 0; i < 4; i++) {
      nicknames.push(this.findElement(`nickname-${i}`).value);
    }

    // トーナメント名を取得
    const tournamentName =
      this.findElement("tournament-name").value ||
      `Tournament ${new Date().toLocaleString()}`;

    // トーナメントを作成
    fetch("/pong/api/create-tournament/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: tournamentName,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log("Tournament created:", data);

          // プレイヤーを各試合に登録（準決勝）
          const promises = [];

          // 準決勝1: プレイヤー1 vs プレイヤー2
          promises.push(
            this.setupGame(data.semifinal_games[0].id, [
              nicknames[0],
              nicknames[1],
            ])
          );

          // 準決勝2: プレイヤー3 vs プレイヤー4
          promises.push(
            this.setupGame(data.semifinal_games[1].id, [
              nicknames[2],
              nicknames[3],
            ])
          );

          Promise.all(promises).then(() => {
            // トーナメントページへ遷移
            this.goNextPage(`/tournament/${data.tournament_id}`);
          });
        } else {
          console.error("Error creating tournament:", data.message);
        }
      })
      .catch((error) => {
        console.error("Error creating tournament:", error);
      });
  }

  // 個別のゲームセットアップ（オプション設定とプレイヤー登録）
  setupGame(gameId, playerNicknames) {
    return new Promise((resolve, reject) => {
      // ゲームオプションを設定
      this.createGameOptions(gameId, () => {
        // プレイヤーを登録
        const playerPromises = playerNicknames.map((nickname, index) => {
          return fetch("/pong/api/create-player/", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              game_id: gameId,
              player_number: index + 1,
              nickname: nickname,
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.message !== "Player created successfully") {
                console.error(data.error);
              }
            })
            .catch((error) => {
              console.error("Error creating player:", error);
            });
        });

        Promise.all(playerPromises).then(resolve).catch(reject);
      });
    });
  }

  createGameOptions(gameId, callback) {
    fetch("/pong/api/create-game-options/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        game_id: gameId,
        ball_count: this.state.ball_count,
        ball_speed: this.state.ball_speed,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "Game options saved successfully") {
          console.log("Game options saved:", data);
          callback();
        } else {
          console.error("Error saving game options:", data.error);
        }
      })
      .catch((error) => {
        console.error("Error saving game options:", error);
        callback();
      });
  }

  createPlayers(gameId, nicknames) {
    const playerCreationPromises = nicknames.map((nickname, index) => {
      return fetch("/pong/api/create-player/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          game_id: gameId,
          player_number: index + 1,
          nickname: nickname,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message !== "Player created successfully") {
            console.error(data.error);
          }
        })
        .catch((error) => {
          console.error("Error creating player:", error);
        });
    });

    Promise.all(playerCreationPromises).then(() => {
      this.goNextPage(`/game/${gameId}`);
    });
  }

  get html() {
    return `
      <div class="container py-3">
        <div class="row justify-content-center">
          <div class="col-md-7 text-center">
            <h3 class="neon-text mb-4">GAME OPTIONS</h3>
            
            <!-- ゲームタイプ - 幅を広げました -->
            <div class="option-section">
              <label class="neon-text-blue small mb-1">Game Type</label>
              <select id="game-type-select" class="form-select form-select-sm neon-select game-type-dropdown">
                <option value="match">Normal Match</option>
                <option value="tournament">Tournament</option>
              </select>
            </div>
            
            <!-- トーナメント情報 -->
            <div id="tournament-info" class="option-section" style="display: none;">
              <label class="neon-text-blue small mb-1">Tournament Name</label>
              <input type="text" id="tournament-name" class="form-control form-control-sm neon-input" placeholder="Tournament Name">
              <small class="tournament-info-text">Tournament requires 4 players</small>
            </div>
            
            <!-- プレイヤー数 -->
            <div class="option-section">
              <label class="neon-text-blue small mb-1">Players</label>
              <div class="d-flex gap-2 justify-content-center">
                <button id="players-2-button" class="neon-btn option-btn flex-grow-1" style="opacity: 1.0;">2 Players</button>
                <button id="players-4-button" class="neon-btn option-btn flex-grow-1" style="opacity: 0.5;">4 Players</button>
              </div>
            </div>
            
            <!-- ボール数 -->
            <div class="option-section">
              <label class="neon-text-blue small mb-1">Ball Count</label>
              <div class="d-flex gap-2 justify-content-center">
                <button id="ball-count-1-button" class="neon-btn option-btn flex-grow-1" style="opacity: 1.0;">1 Ball</button>
                <button id="ball-count-2-button" class="neon-btn option-btn flex-grow-1" style="opacity: 0.5;">2 Balls</button>
              </div>
            </div>
            
            <!-- ボール速度 -->
            <div class="option-section">
              <label class="neon-text-blue small mb-1">Ball Speed</label>
              <div class="d-flex gap-2 justify-content-center">
                <button id="ball-speed-slow-button" class="neon-btn option-btn flex-grow-1" style="opacity: 0.5;">Slow</button>
                <button id="ball-speed-normal-button" class="neon-btn option-btn flex-grow-1" style="opacity: 1.0;">Normal</button>
                <button id="ball-speed-fast-button" class="neon-btn option-btn flex-grow-1" style="opacity: 0.5;">Fast</button>
              </div>
            </div>
            
            <!-- プレイヤー名 -->
            <div class="option-section mb-4">
              <label class="neon-text-blue small mb-1">Player Names</label>
              <div id="nicknames-container"></div>
            </div>
            
            <!-- ボタンエリア -->
            <div class="d-flex justify-content-center gap-3 mt-4">
              <button id="home-button" class="neon-btn action-btn">HOME</button>
              <button id="start-game-button" class="neon-btn action-btn start-btn">START</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
