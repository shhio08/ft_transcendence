import { Component } from "../core/component.js";

export class Result extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.gameId = params.gameId;
    if (!this.gameId) {
      console.error("Game ID is undefined");
      return;
    }
    this.loadResultData();
  }

  loadResultData() {
    fetch(`/pong/api/get-result/?game_id=${this.gameId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          console.error(data.error);
        } else {
          this.winner = data.winner;
          this.player1Score = data.player1Score;
          this.player2Score = data.player2Score;
          this.player1Nickname = data.players[0].nickname;
          this.player2Nickname = data.players[1].nickname;
          this.render();
        }
      })
      .catch((error) => {
        console.error("Error loading result data:", error);
      });
  }

  resetGameState() {
    // ゲームの状態を初期化
    this.winner = null;
    this.player1Score = 0;
    this.player2Score = 0;
  }

  get html() {
    return `
            <h1>Match Result</h1>
            <p>Game ID: ${this.gameId}</p>
            <p>Final Scores:</p>
            <p>${this.player1Nickname}: ${
      this.player1Score !== undefined ? this.player1Score : "Loading..."
    }</p>
            <p>${this.player2Nickname}: ${
      this.player2Score !== undefined ? this.player2Score : "Loading..."
    }</p>
            <p>Congratulations to ${
              this.winner || "Loading..."
            } for winning!</p>
            <button id="back-home-button">Return to Home</button>
        `;
  }

  render() {
    super.render();
    this.findElement("back-home-button").onclick = () => {
      this.resetGameState();
      this.goNextPage("/home");
    };
  }
}
