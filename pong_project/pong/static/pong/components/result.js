import { Component } from "../core/component.js";

export class Result extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.gameId = params.gameId;
    if (!this.gameId) {
      console.error("Game ID is undefined");
      return;
    }

    // プレイヤーデータを格納する配列を初期化
    this.players = [];

    this.loadResultData();

    // カスタムイベントリスナーを保存
    this._boundScoreUpdatedHandler = this.handleScoreUpdated.bind(this);
    window.addEventListener("scoreUpdated", this._boundScoreUpdatedHandler);

    // クリーンアップ関数を登録
    if (this.router && this.router.registerCleanup) {
      this.router.registerCleanup(() => {
        window.removeEventListener(
          "scoreUpdated",
          this._boundScoreUpdatedHandler
        );
        console.log("Result component cleaned up");
      });
    }
  }

  handleScoreUpdated(event) {
    if (event.detail.gameId === this.gameId) {
      console.log("Score updated event received, reloading result data");
      this.loadResultData();
    }
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

          // 全プレイヤーデータを保存
          this.players = data.players || [];

          // 後方互換性のために、従来のプロパティも設定
          if (this.players.length >= 1) {
            this.player1Score = this.players[0].score;
            this.player1Nickname = this.players[0].nickname;
          }

          if (this.players.length >= 2) {
            this.player2Score = this.players[1].score;
            this.player2Nickname = this.players[1].nickname;
          }

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
    this.players = [];
    this.player1Score = 0;
    this.player2Score = 0;
  }

  // プレイヤースコアを表示するHTMLを生成
  generatePlayersScoresHtml() {
    if (!this.players || this.players.length === 0) {
      return "<p>Loading player data...</p>";
    }

    let html = '<div class="scores-container">';

    this.players.forEach((player, index) => {
      html += `<p>Player ${index + 1} (${player.nickname}): ${
        player.score
      }</p>`;
    });

    html += "</div>";
    return html;
  }

  get html() {
    return `
      <h1>Match Result</h1>
      <p>Game ID: ${this.gameId}</p>
      <p>Final Scores:</p>
      ${this.generatePlayersScoresHtml()}
      <p>Congratulations to ${this.winner || "Loading..."} for winning!</p>
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
