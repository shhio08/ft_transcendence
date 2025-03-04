import { Component } from "../core/component.js";

export class LocalGameOptions extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.state = {
      mode: "local",
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
      this.createGame();
    };
  }

  updatePlayerButtons() {
    const players2Button = this.findElement("players-2-button");
    const players4Button = this.findElement("players-4-button");

    if (this.state.players === 2) {
      players2Button.style.opacity = "1.0";
      players4Button.style.opacity = "0.5";
    } else {
      players2Button.style.opacity = "0.5";
      players4Button.style.opacity = "1.0";
    }
  }

  updateBallCountButtons() {
    const ballCount1Button = this.findElement("ball-count-1-button");
    const ballCount2Button = this.findElement("ball-count-2-button");

    if (this.state.ball_count === 1) {
      ballCount1Button.style.opacity = "1.0";
      ballCount2Button.style.opacity = "0.5";
    } else {
      ballCount1Button.style.opacity = "0.5";
      ballCount2Button.style.opacity = "1.0";
    }
  }

  updateBallSpeedButtons() {
    const slowButton = this.findElement("ball-speed-slow-button");
    const normalButton = this.findElement("ball-speed-normal-button");
    const fastButton = this.findElement("ball-speed-fast-button");

    slowButton.style.opacity = "0.5";
    normalButton.style.opacity = "0.5";
    fastButton.style.opacity = "0.5";

    if (this.state.ball_speed === "slow") {
      slowButton.style.opacity = "1.0";
    } else if (this.state.ball_speed === "normal") {
      normalButton.style.opacity = "1.0";
    } else if (this.state.ball_speed === "fast") {
      fastButton.style.opacity = "1.0";
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
          <option value="match">Match</option>
          <option value="tournament">Tournament</option>
        </select>
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
