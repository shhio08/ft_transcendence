import { Component } from "../core/component.js";

export class Result extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.gameId = params.gameId;

    // ログインチェック
    if (!this.router.isLoggedIn()) {
      console.log("Unauthorized access, redirecting to top page");
      this.router.goNextPage("/");
      return;
    }

    if (!this.gameId) {
      console.error("Game ID is undefined");
      this.router.goNextPage("/home");
      return;
    }

    // ゲームの存在確認
    this.validateGame();

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

  validateGame() {
    fetch(`/pong/api/get-result/?game_id=${this.gameId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Game not found");
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          console.error(data.error);
          this.router.goNextPage("/home");
        } else {
          this.loadResultData(); // 既存の処理を呼び出す
        }
      })
      .catch((error) => {
        console.error("Error validating game:", error);
        this.router.goNextPage("/home");
      });
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
      return "<p class='neon-text-blue'>Loading player data...</p>";
    }

    // プレイヤー数に基づいてレイアウトを決定
    const isFourPlayerGame = this.players.length >= 4;

    if (isFourPlayerGame) {
      return `
        <div class="match-wrapper mt-4">
          <!-- 第1試合：Player 1 vs Player 2 -->
          <div class="match-row mb-3">
            <div class="player-info">
              <span class="player-name neon-text-blue">${this.players[0].nickname}</span>
            </div>
            <div class="score-display" style="min-width: 100px; text-align: center;">
              <span>${this.players[0].score}</span>
              <span class="neon-text">&nbsp;-&nbsp;</span>
              <span>${this.players[1].score}</span>
            </div>
            <div class="player-info">
              <span class="player-name neon-text-blue">${this.players[1].nickname}</span>
            </div>
          </div>
          
          <!-- 第2試合：Player 3 vs Player 4 -->
          <div class="match-row">
            <div class="player-info">
              <span class="player-name neon-text-blue">${this.players[2].nickname}</span>
            </div>
            <div class="score-display" style="min-width: 100px; text-align: center;">
              <span>${this.players[2].score}</span>
              <span class="neon-text">&nbsp;-&nbsp;</span>
              <span>${this.players[3].score}</span>
            </div>
            <div class="player-info">
              <span class="player-name neon-text-blue">${this.players[3].nickname}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      // 2人プレイの場合
      return `
        <div class="players-container d-flex justify-content-center align-items-center my-4">
          <div class="player-info text-center">
            <span class="player-name neon-text-blue">${this.players[0].nickname}</span>
          </div>
          <div class="score mx-4">
            <span class="neon-text-lg">${this.players[0].score} &nbsp;-&nbsp; ${this.players[1].score}</span>
          </div>
          <div class="player-info text-center">
            <span class="player-name neon-text-blue">${this.players[1].nickname}</span>
          </div>
        </div>
      `;
    }
  }

  get html() {
    return `
      <div class="container py-5">
        <h1 class="neon-text text-center mb-4">MATCH RESULT</h1>
        
        <div class="result-container p-4 mb-4 text-center">
          <h3 class="neon-text mb-4">FINAL SCORES</h3>
          ${this.generatePlayersScoresHtml()}
          
          <div class="winner-display mt-4">
            <h4 class="neon-text-lg mb-3">WINNER</h4>
            <div class="winner-name neon-text-blue mb-3">${
              this.winner || "Loading..."
            }</div>
            <div class="trophy-icon mb-3">🏆</div>
          </div>
        </div>
        
        <div class="text-center mt-4">
          <button id="back-home-button" class="neon-btn btn-lg">RETURN TO HOME</button>
        </div>
      </div>
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
