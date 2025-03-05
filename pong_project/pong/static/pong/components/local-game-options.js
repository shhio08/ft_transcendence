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
    for (let i = 0; i < this.state.players; i++) {
      nicknamesContainer.innerHTML += `
        <div>
          <label>Player ${i + 1} Nickname:</label>
          <input type="text" value="${
            this.state.nicknames[i]
          }" id="nickname-${i}">
        </div>
      `;
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
      <h1>Local Game Options</h1>
      <div>
        <label>Game Type:</label>
        <select id="game-type-select">
          <option value="match">通常対戦</option>
          <option value="tournament">トーナメント</option>
        </select>
      </div>
      
      <div id="tournament-info" style="display: none;">
        <p class="info-text">トーナメントモードでは4人プレイヤーが必要です。</p>
        <div>
          <label>Tournament Name:</label>
          <input type="text" id="tournament-name" placeholder="My Tournament">
        </div>
      </div>
      
      <div>
        <label>Number of Players:</label>
        <button id="players-2-button" style="opacity: 1.0;">2 Players</button>
        <button id="players-4-button" style="opacity: 0.5;">4 Players</button>
      </div>
      
      <div>
        <label>Ball Count:</label>
        <button id="ball-count-1-button" style="opacity: 1.0;">1 Ball</button>
        <button id="ball-count-2-button" style="opacity: 0.5;">2 Balls</button>
      </div>
      
      <div>
        <label>Ball Speed:</label>
        <button id="ball-speed-slow-button" style="opacity: 0.5;">Slow</button>
        <button id="ball-speed-normal-button" style="opacity: 1.0;">Normal</button>
        <button id="ball-speed-fast-button" style="opacity: 0.5;">Fast</button>
      </div>
      
      <div id="nicknames-container"></div>
      <button id="start-game-button">Start Game</button>
    `;
  }
}
