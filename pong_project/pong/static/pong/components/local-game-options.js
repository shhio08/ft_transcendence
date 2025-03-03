import { Component } from "../core/component.js";

export class LocalGameOptions extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.state = {
      mode: "local",
      players: 2,
      nicknames: [
        this.state.username || "Player 1",
        "Player 2",
        "Player 3",
        "Player 4",
      ],
    };
    console.log("state.username: " + this.state.username);
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
          this.createPlayers(data.id, nicknames);
        } else {
          console.error("Error creating game:", data.error);
        }
      })
      .catch((error) => {
        console.error("Error creating game:", error);
      });
  }

  createPlayers(gameId, nicknames) {
    const playerCreationPromises = nicknames.map((nickname, index) => {
      return fetch("/pong/api/create-player/", {
        method: "POST",
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
          console.log("Player creation response:", data);
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
      <div id="nicknames-container"></div>
      <button id="start-game-button">Start Game</button>
    `;
  }
}
