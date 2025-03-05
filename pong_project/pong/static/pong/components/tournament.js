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

    this.render();
    this.loadTournamentData();
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
      return `<div class="match-status">試合はまだ行われていません</div>`;
    }

    // プレイヤーが登録されている場合
    const player1 = match.players.find((p) => p.player_number === 1);
    const player2 = match.players.find((p) => p.player_number === 2);

    if (!player1 || !player2) {
      return `<div class="match-status">プレイヤー情報が不完全です</div>`;
    }

    // スコアが0-0の場合は試合が終わっていない
    if (player1.score === 0 && player2.score === 0) {
      return `
        <div class="match-players">
          <div class="player">${player1.nickname}</div>
          <div class="vs">VS</div>
          <div class="player">${player2.nickname}</div>
        </div>
        <button class="start-match-button" data-game-id="${match.game_id}">
          試合開始
        </button>
      `;
    }

    // スコアがある場合は結果を表示
    const winner = player1.score > player2.score ? player1 : player2;

    return `
      <div class="match-result">
        <div class="match-players">
          <div class="player ${
            player1.score > player2.score ? "winner" : ""
          }">${player1.nickname}: ${player1.score}</div>
          <div class="vs">VS</div>
          <div class="player ${
            player2.score > player1.score ? "winner" : ""
          }">${player2.nickname}: ${player2.score}</div>
        </div>
        <div class="winner-announcement">${winner.nickname} の勝利!</div>
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
      return `<div class="empty-bracket">試合情報がありません</div>`;
    }

    // 準決勝の試合を取得
    const semifinalMatches = this.matches.filter(
      (m) => m.round === "semifinal"
    );
    // 決勝戦を取得
    const finalMatch = this.matches.find((m) => m.round === "final");

    if (semifinalMatches.length < 2 || !finalMatch) {
      return `<div class="empty-bracket">トーナメント構成が不完全です</div>`;
    }

    return `
      <div class="tournament-bracket">
        <div class="round semifinal">
          <h3>準決勝</h3>
          <div class="matches">
            <div class="match" id="semifinal-1">
              <h4>準決勝 1</h4>
              ${this.getMatchResultDisplay(semifinalMatches[0])}
            </div>
            <div class="match" id="semifinal-2">
              <h4>準決勝 2</h4>
              ${this.getMatchResultDisplay(semifinalMatches[1])}
            </div>
          </div>
        </div>
        
        <div class="round final">
          <h3>決勝</h3>
          <div class="matches">
            <div class="match" id="final">
              <h4>決勝戦</h4>
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
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
      }
      
      .tournament-header {
        text-align: center;
        margin-bottom: 30px;
      }
      
      .tournament-bracket {
        display: flex;
        flex-direction: column;
        gap: 40px;
      }
      
      .round {
        margin-bottom: 20px;
      }
      
      .round h3 {
        text-align: center;
        margin-bottom: 15px;
      }
      
      .matches {
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
        gap: 20px;
      }
      
      .match {
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 15px;
        width: 300px;
        background: #f9f9f9;
      }
      
      .match h4 {
        text-align: center;
        margin-bottom: 10px;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
      }
      
      .match-players {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .player {
        font-weight: bold;
      }
      
      .winner {
        color: green;
      }
      
      .vs {
        padding: 0 10px;
        color: #666;
      }
      
      .winner-announcement {
        text-align: center;
        font-weight: bold;
        color: green;
        margin-top: 10px;
      }
      
      .start-match-button {
        display: block;
        width: 100%;
        padding: 8px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
      }
      
      .start-match-button:hover {
        background-color: #45a049;
      }
      
      .loading-spinner {
        text-align: center;
        padding: 20px;
      }
      
      .error-message {
        color: red;
        text-align: center;
        padding: 20px;
      }
    `;

    this.element.appendChild(styleElement);
  }

  get html() {
    if (this.loading) {
      return `
        <div class="loading-spinner">
          <p>トーナメント情報を読み込み中...</p>
        </div>
      `;
    }

    if (this.error) {
      return `
        <div class="error-message">
          <p>エラー: ${this.error}</p>
          <button onclick="window.location.reload()">再読み込み</button>
        </div>
      `;
    }

    if (!this.tournament) {
      return `
        <div class="error-message">
          <p>トーナメント情報が見つかりません</p>
          <button onclick="window.location.href='/home'">ホームに戻る</button>
        </div>
      `;
    }

    return `
      <div class="tournament-container">
        <div class="tournament-header">
          <h1>${this.tournament.name}</h1>
          <p>ステータス: ${this.getTournamentStatus()}</p>
          <p>作成者: ${this.tournament.created_by_username}</p>
          <p>作成日: ${new Date(
            this.tournament.created_at
          ).toLocaleString()}</p>
        </div>
        
        ${this.generateTournamentBracket()}
        
        <div class="actions">
          <button onclick="window.location.href='/home'">ホームに戻る</button>
        </div>
      </div>
    `;
  }

  getTournamentStatus() {
    if (!this.matches || this.matches.length === 0) return "準備中";

    // 決勝戦の結果が入っているか確認
    const finalMatch = this.matches.find((m) => m.round === "final");
    if (finalMatch && this.isMatchCompleted(finalMatch)) return "終了";

    // 少なくとも1つの試合が始まっているか確認
    const anyMatchStarted = this.matches.some(
      (m) => m.players && m.players.length > 0
    );

    return anyMatchStarted ? "進行中" : "準備中";
  }

  // ページがアクティブになったときにデータを再読み込み
  onActivate() {
    // すでに実装されているloadTournamentData()を呼び出す
    this.loadTournamentData();
  }
}
