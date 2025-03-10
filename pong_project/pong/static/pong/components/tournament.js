import { Component } from "../core/component.js";

export class Tournament extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.tournamentId = params.tournamentId;
    this.tournament = null;
    this.matches = [];

    // ロード中の状態を設定
    this.loading = true;
    this.error = null;

    // カスタムイベントリスナーを保存（スコア更新時に自動更新）
    this._boundScoreUpdatedHandler = this.handleScoreUpdated.bind(this);
    window.addEventListener("scoreUpdated", this._boundScoreUpdatedHandler);

    // クリーンアップ関数を登録
    if (this.router && this.router.registerCleanup) {
      this.router.registerCleanup(() => {
        window.removeEventListener(
          "scoreUpdated",
          this._boundScoreUpdatedHandler
        );
        console.log("Tournament component cleaned up");
      });
    }

    // ログインチェック
    if (!this.router.isLoggedIn()) {
      console.log("Unauthorized access, redirecting to top page");
      this.router.goNextPage("/");
      return;
    }

    if (!this.tournamentId) {
      console.error("Tournament ID is undefined");
      this.router.goNextPage("/home");
      return;
    }

    // トーナメントの存在確認
    this.validateTournament();
  }

  validateTournament() {
    fetch(`/pong/api/get-tournament/?tournament_id=${this.tournamentId}`, {
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Tournament not found");
        }
        return response.json();
      })
      .then((data) => {
        if (data.status !== "success") {
          console.error("Tournament data error:", data.message);
          this.router.goNextPage("/home");
        } else {
          this.loadTournamentData();
        }
      })
      .catch((error) => {
        console.error("Error validating tournament:", error);
        this.router.goNextPage("/home");
      });
  }

  // スコア更新イベント処理
  handleScoreUpdated(event) {
    console.log("Score updated event received in tournament component");
    // データを再読み込み
    this.loadTournamentData();
  }

  loadTournamentData() {
    fetch(`/pong/api/get-tournament/?tournament_id=${this.tournamentId}`, {
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.status === "success") {
          this.tournament = data.tournament;
          this.matches = data.matches;
          this.loading = false;
          this.error = null;

          // 準決勝の結果をチェックして、決勝戦のプレイヤーを設定
          this.checkSemifinalsAndSetupFinal();

          this.render();
        } else {
          this.error = data.message || "Failed to load tournament data";
          this.loading = false;
          this.render();
        }
      })
      .catch((error) => {
        console.error("Error loading tournament data:", error);
        this.error = "トーナメントデータの読み込みに失敗しました";
        this.loading = false;
        this.render();
      });
  }

  // 準決勝の結果をチェックして、決勝戦のプレイヤーを設定する
  checkSemifinalsAndSetupFinal() {
    if (!this.matches || this.matches.length === 0) return;

    // 準決勝の試合を取得
    const semifinalMatches = this.matches.filter(
      (m) => m.round === "semifinal"
    );
    if (semifinalMatches.length < 2) return;

    // 決勝戦を取得
    const finalMatch = this.matches.find((m) => m.round === "final");
    if (!finalMatch) return;

    // 決勝戦にすでにプレイヤーが設定されている場合は何もしない
    if (finalMatch.players && finalMatch.players.length > 0) return;

    // 両方の準決勝が終了しているか確認
    const semifinal1Completed = this.isMatchCompleted(semifinalMatches[0]);
    const semifinal2Completed = this.isMatchCompleted(semifinalMatches[1]);

    if (semifinal1Completed && semifinal2Completed) {
      // 両方の準決勝の勝者を取得
      const semifinal1Winner = this.getMatchWinner(semifinalMatches[0]);
      const semifinal2Winner = this.getMatchWinner(semifinalMatches[1]);

      if (semifinal1Winner && semifinal2Winner) {
        // 決勝戦のプレイヤーを設定するAPIを呼び出す
        this.setupFinalMatch(
          finalMatch.game_id,
          semifinal1Winner,
          semifinal2Winner
        );
      }
    }
  }

  // 試合が完了しているか確認
  isMatchCompleted(match) {
    if (!match.players || match.players.length < 2) return false;

    const player1 = match.players.find((p) => p.player_number === 1);
    const player2 = match.players.find((p) => p.player_number === 2);

    // どちらかのスコアが0より大きければ試合は完了している
    return player1 && player2 && (player1.score > 0 || player2.score > 0);
  }

  // 試合の勝者を取得
  getMatchWinner(match) {
    if (!match.players || match.players.length < 2) return null;

    const player1 = match.players.find((p) => p.player_number === 1);
    const player2 = match.players.find((p) => p.player_number === 2);

    if (!player1 || !player2) return null;

    return player1.score > player2.score ? player1 : player2;
  }

  // 決勝戦のプレイヤーを設定
  setupFinalMatch(gameId, winner1, winner2) {
    // 最初に同じオプションを設定
    this.setupGameOptions(gameId)
      .then(() => {
        // 両方の勝者を決勝戦のプレイヤーとして登録
        return fetch("/pong/api/setup-final-match/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            game_id: gameId,
            winner1_id: winner1.id,
            winner2_id: winner2.id,
            tournament_id: this.tournamentId,
          }),
        });
      })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          this.loadTournamentData(); // データを再読み込みして表示を更新
        } else {
          console.error("Failed to setup final match:", data.message);
        }
      })
      .catch((error) => {
        console.error("Error setting up final match:", error);
      });
  }

  // ゲームオプションを設定（準決勝と同じオプション）
  setupGameOptions(gameId) {
    return fetch("/pong/api/create-game-options/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        game_id: gameId,
        ball_count: 1, // デフォルトオプション
        ball_speed: "normal",
      }),
    }).then((response) => response.json());
  }

  startMatch(gameId) {
    // ゲームページに遷移
    this.goNextPage(`/game/${gameId}`);
  }

  // 試合の結果を表示するためのヘルパー関数
  getMatchResultDisplay(match) {
    if (!match.players || match.players.length === 0) {
      return `<div class="match-status">MATCH NOT STARTED YET</div>`;
    }

    // プレイヤーが登録されている場合
    const player1 = match.players.find((p) => p.player_number === 1);
    const player2 = match.players.find((p) => p.player_number === 2);

    if (!player1 || !player2) {
      return `<div class="match-status">INCOMPLETE PLAYER DATA</div>`;
    }

    // スコアが0-0の場合は試合が終わっていない
    if (player1.score === 0 && player2.score === 0) {
      return `
        <div class="match-players">
          <div class="player-wrapper">
            <div class="player">${player1.nickname}</div>
          </div>
          <div class="vs">VS</div>
          <div class="player-wrapper">
            <div class="player">${player2.nickname}</div>
          </div>
        </div>
        <button class="start-match-button" data-game-id="${match.game_id}">
          START MATCH
        </button>
      `;
    }

    // スコアがある場合は結果を表示
    const winner = player1.score > player2.score ? player1 : player2;

    return `
      <div class="match-result">
        <div class="match-players">
          <div class="player-wrapper">
            <div class="player ${
              player1.score > player2.score ? "winner" : ""
            }">${player1.nickname}</div>
            <div class="player-score ${
              player1.score > player2.score ? "winner" : ""
            }">${player1.score}</div>
          </div>
          <div class="vs">VS</div>
          <div class="player-wrapper">
            <div class="player ${
              player2.score > player1.score ? "winner" : ""
            }">${player2.nickname}</div>
            <div class="player-score ${
              player2.score > player1.score ? "winner" : ""
            }">${player2.score}</div>
          </div>
        </div>
        <div class="winner-announcement">${winner.nickname} WINS!</div>
      </div>
    `;
  }

  attachEventListeners() {
    // 試合開始ボタンのイベントリスナーを追加
    const startButtons = this.element.querySelectorAll(".start-match-button");
    startButtons.forEach((button) => {
      const gameId = button.getAttribute("data-game-id");
      button.onclick = () => this.startMatch(gameId);
    });
  }

  // トーナメントのブラケットを生成するヘルパー関数
  generateTournamentBracket() {
    if (!this.matches || this.matches.length === 0) {
      return `<div class="empty-bracket">NO MATCHES AVAILABLE</div>`;
    }

    // 準決勝の試合を取得
    const semifinalMatches = this.matches.filter(
      (m) => m.round === "semifinal"
    );
    // 決勝戦を取得
    const finalMatch = this.matches.find((m) => m.round === "final");

    if (semifinalMatches.length < 2 || !finalMatch) {
      return `<div class="empty-bracket">INCOMPLETE TOURNAMENT STRUCTURE</div>`;
    }

    return `
      <div class="tournament-bracket">
        <div class="round semifinal">
          <h3>SEMIFINALS</h3>
          <div class="matches">
            <div class="match" id="semifinal-1">
              <h4>SEMIFINAL 1</h4>
              ${this.getMatchResultDisplay(semifinalMatches[0])}
            </div>
            <div class="match" id="semifinal-2">
              <h4>SEMIFINAL 2</h4>
              ${this.getMatchResultDisplay(semifinalMatches[1])}
            </div>
          </div>
        </div>
        
        <div class="round final">
          <h3>FINAL</h3>
          <div class="matches">
            <div class="match" id="final">
              <h4>FINAL MATCH</h4>
              ${this.getMatchResultDisplay(finalMatch)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    this.element.innerHTML = this.html;
    this.attachEventListeners();

    // スタイルを追加
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .tournament-container {
        padding: 15px;
        max-width: 900px;
        margin: 0 auto;
      }
      
      .tournament-header {
        text-align: center;
        background-color: rgba(0, 0, 0, 0.7);
        border: 1px solid #00ffff;
        border-radius: 6px;
        box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
        padding: 10px 15px;
        margin-bottom: 20px;
      }
      
      .tournament-header h1 {
        font-size: 1.8rem;
        margin-bottom: 10px;
      }
      
      .tournament-bracket {
        display: flex;
        flex-direction: column;
        gap: 25px;
      }
      
      .round {
        margin-bottom: 15px;
      }
      
      .round h3 {
        text-align: center;
        margin-bottom: 10px;
        font-size: 1.2rem;
        color: #00FFFF;
        text-shadow: 0 0 5px #00FFFF;
      }
      
      .matches {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 15px;
      }
      
      .match {
        border: 1px solid #00ffff;
        border-radius: 6px;
        padding: 12px;
        width: 400px;
        background: rgba(0, 0, 0, 0.7);
        box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
      }
      
      .match h4 {
        text-align: center;
        margin-bottom: 8px;
        border-bottom: 1px solid #00FFFF;
        padding-bottom: 4px;
        font-size: 1rem;
        color: #FFFFFF;
        text-shadow: 0 0 2px #fff, 0 0 4px #00ffff;
      }
      
      .match-players {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        color: #FFFFFF;
      }
      
      .player-wrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex: 1;
      }
      
      .player {
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
      }
      
      .player-score {
        margin-left: 8px;
        font-weight: bold;
      }
      
      .winner {
        color: #00FFFF;
        text-shadow: 0 0 3px #00FFFF;
      }
      
      .vs {
        padding: 0 8px;
        color: #FFFFFF;
        flex-shrink: 0;
      }
      
      .winner-announcement {
        text-align: center;
        font-weight: bold;
        color: #00FFFF;
        text-shadow: 0 0 3px #00FFFF;
        margin-top: 8px;
        font-size: 0.9rem;
      }
      
      .start-match-button {
        display: block;
        width: 100%;
        padding: 6px;
        background-color: rgba(10, 10, 22, 0.9);
        color: white;
        border: 1px solid #00ffff;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 8px;
        font-family: "Press Start 2P", cursive;
        letter-spacing: 1px;
        box-shadow: 0 0 4px rgba(0, 255, 255, 0.3);
        text-transform: uppercase;
        font-weight: bold;
        transition: all 0.3s ease;
        font-size: 0.8rem;
      }
      
      .start-match-button:hover {
        background-color: #00ffff;
        color: black;
      }
      
      .loading-spinner {
        text-align: center;
        padding: 15px;
        color: #00FFFF;
        text-shadow: 0 0 3px #00FFFF;
      }
      
      .error-message {
        color: #FF0000;
        text-align: center;
        padding: 15px;
        text-shadow: 0 0 3px #FF0000;
      }
      
      .empty-bracket {
        text-align: center;
        padding: 20px;
        background-color: rgba(0, 0, 0, 0.7);
        border: 1px solid #00ffff;
        border-radius: 6px;
        box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
        color: #00FFFF;
        text-shadow: 0 0 3px #00FFFF;
        font-size: 0.9rem;
      }
      
      .actions {
        text-align: center;
        margin-top: 20px;
      }
      
      .match-status {
        color: #FFFFFF;
        text-align: center;
        padding: 8px;
        font-size: 0.8rem;
      }
      
      .tournament-info {
        display: flex;
        justify-content: center;
        gap: 15px;
        flex-wrap: wrap;
        margin-bottom: 10px;
        font-size: 0.9rem;
      }
      
      .info-item {
        color: #FFFFFF;
      }
      
      .info-label {
        color: #00FFFF;
        margin-right: 3px;
      }
      
      .neon-btn {
        background-color: rgba(10, 10, 22, 0.9);
        color: white;
        border: 1px solid #00ffff;
        border-radius: 4px;
        cursor: pointer;
        padding: 6px 12px;
        font-family: "Press Start 2P", cursive;
        letter-spacing: 1px;
        box-shadow: 0 0 4px rgba(0, 255, 255, 0.3);
        text-transform: uppercase;
        font-weight: bold;
        transition: all 0.3s ease;
        font-size: 0.8rem;
      }
      
      .neon-btn:hover {
        background-color: #00ffff;
        color: black;
      }
    `;

    this.element.appendChild(styleElement);
  }

  get html() {
    if (this.loading) {
      return `
        <div class="loading-spinner">
          <p>LOADING TOURNAMENT DATA...</p>
        </div>
      `;
    }

    if (this.error) {
      return `
        <div class="error-message">
          <p>ERROR: ${this.error}</p>
          <button class="neon-btn" onclick="window.location.reload()">RELOAD</button>
        </div>
      `;
    }

    if (!this.tournament) {
      return `
        <div class="error-message">
          <p>TOURNAMENT NOT FOUND</p>
          <button class="neon-btn" onclick="window.location.href='/home'">BACK TO HOME</button>
        </div>
      `;
    }

    return `
      <div class="tournament-container">
        <div class="tournament-header">
          <h1 class="neon-text">${this.tournament.name}</h1>
          
          <div class="tournament-info">
            <span class="info-item">
              <span class="info-label">STATUS:</span>
              ${this.getTournamentStatus()}
            </span>
            <span class="info-item">
              <span class="info-label">CREATED BY:</span>
              ${this.tournament.created_by_username}
            </span>
            <span class="info-item">
              <span class="info-label">DATE:</span>
              ${new Date(this.tournament.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        ${this.generateTournamentBracket()}
        
        <div class="actions">
          <button class="neon-btn" onclick="window.location.href='/home'">BACK TO HOME</button>
        </div>
      </div>
    `;
  }

  getTournamentStatus() {
    if (!this.matches || this.matches.length === 0) return "PREPARING";

    // 決勝戦の結果が入っているか確認
    const finalMatch = this.matches.find((m) => m.round === "final");
    if (finalMatch && this.isMatchCompleted(finalMatch)) return "COMPLETED";

    // 少なくとも1つの試合が始まっているか確認
    const anyMatchStarted = this.matches.some(
      (m) => m.players && m.players.length > 0
    );

    return anyMatchStarted ? "IN PROGRESS" : "PREPARING";
  }

  // ページがアクティブになったときにデータを再読み込み
  onActivate() {
    // すでに実装されているloadTournamentData()を呼び出す
    this.loadTournamentData();
  }
}
