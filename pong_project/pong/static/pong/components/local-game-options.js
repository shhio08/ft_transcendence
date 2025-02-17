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
    this.render();
    this.attachEventListeners();
  }

  attachEventListeners() {
    this.findElement("players-select").onchange = (event) => {
      this.state.players = parseInt(event.target.value, 10);
      this.renderNicknames();
    };

    this.findElement("start-game-button").onclick = () => {
      this.createGame();
    };
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
          this.goNextPage(`/game/${data.id}`);
        } else {
          console.error(data.error);
        }
      })
      .catch((error) => {
        console.error("Error creating game:", error);
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
        <select id="players-select">
          <option value="2">2</option>
          <option value="4">4</option>
        </select>
      </div>
      <div id="nicknames-container"></div>
      <button id="start-game-button">Start Game</button>
    `;
  }
}
