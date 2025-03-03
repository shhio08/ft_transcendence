import { Component } from "../core/component.js";

export class Game extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.gameId = params.gameId; // ルートパラメータからゲームIDを取得
    this.isGameRunning = true;
    this.animationFrameId = null; // requestAnimationFrameのIDを保存
    this.loadGameData();

    // イベントリスナー参照を保存するための変数
    this._boundStopGameLoop = this.stopGameLoop.bind(this);
    this._boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);

    // イベントリスナーを保存した参照で登録
    window.addEventListener("beforeunload", this._boundStopGameLoop);
    document.addEventListener(
      "visibilitychange",
      this._boundHandleVisibilityChange
    );

    console.log("Game component initialized with ID:", this.gameId);

    // デバッグ用
    window._gameDebug = this;

    this.cleanupFunction = () => {
      console.log("Cleanup function triggered for game:", this.gameId);
      this.stopGameLoop();
      this.removeAllEventListeners();
      this.isGameRunning = false;
      delete window._gameDebug; // デバッグ参照を削除
      console.log("Game cleanup complete - Game loop should be stopped");
    };

    if (this.router && this.router.registerCleanup) {
      this.router.registerCleanup(this.cleanupFunction);
    }
  }

  removeAllEventListeners() {
    console.log("Removing all event listeners");
    window.removeEventListener("beforeunload", this._boundStopGameLoop);
    document.removeEventListener(
      "visibilitychange",
      this._boundHandleVisibilityChange
    );
  }

  stopGameLoop() {
    console.log("Stopping game loop");
    this.isGameRunning = false;

    // アニメーションフレームをキャンセル
    if (this.animationFrameId) {
      console.log("Cancelling animation frame:", this.animationFrameId);
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // もしsetIntervalを使っている場合（gameTimerId等の変数があれば）
    if (this.gameTimerId) {
      console.log("Clearing game timer:", this.gameTimerId);
      clearInterval(this.gameTimerId);
      this.gameTimerId = null;
    }
  }

  handleVisibilityChange() {
    if (document.hidden) {
      console.log("Tab hidden - pausing game");
      this.isGameRunning = false;
    } else if (!document.hidden && !this.gameEnded) {
      console.log("Tab visible - resuming game");
      this.isGameRunning = true;
    }
  }

  destroy() {
    console.log("Game component being destroyed");
    this.cleanupFunction();
  }

  loadGameData() {
    fetch(`/pong/api/get-game/?game_id=${this.gameId}`, {
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Game data:", data);
        if (data.error) {
          console.error(data.error);
          this.router.goNextPage("/home");
        } else {
          this.state = { ...this.state, ...data };
          this.initGame();
          this.loadPlayerData();
        }
      })
      .catch((error) => {
        console.error("Error loading game data:", error);
        this.router.goNextPage("/home");
      });
  }

  loadPlayerData() {
    fetch(`/pong/api/get-players/?game_id=${this.gameId}`, {
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Player data:", data); // デバッグログ
        if (data.error) {
          console.error(data.error);
        } else if (data.players && data.players.length > 0) {
          this.state.players = data.players; // プレイヤーデータをstateに設定
          console.log("Players set in state:", this.state.players); // デバッグログ
          this.setupScoreDisplay(); // プレイヤーデータが設定された後に呼び出す
        } else {
          console.error("No players found");
        }
      })
      .catch((error) => {
        console.error("Error loading player data:", error);
      });
  }

  displayPlayerNames(players) {
    if (players.length > 0) {
      this.player1ScoreElement.innerText = `Player 1: ${
        players[0].nickname || "Unknown"
      }`;
      if (players.length > 1) {
        this.player2ScoreElement.innerText = `Player 2: ${
          players[1].nickname || "Unknown"
        }`;
      }
    }
  }

  initGame() {
    this.score = { player1: 0, player2: 0 };
    this.ball = { x: 400, y: 200, radius: 10, speedX: 12, speedY: 12 };
    this.paddle1 = { x: 10, y: 150, width: 10, height: 100, speed: 5 };
    this.paddle2 = { x: 780, y: 150, width: 10, height: 100, speed: 5 };
    this.setupCanvas();
    this.setupControls();
    this.startGameLoop();
  }

  setupCanvas() {
    // キャンバスの設定
    const gameContainer = this.findElement("game-container");
    if (!gameContainer) {
      console.error("Game container element not found");
      return;
    }
    const canvasContainer = document.createElement("div");
    canvasContainer.style.display = "flex";
    canvasContainer.style.justifyContent = "center";
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 400;
    canvasContainer.appendChild(canvas);
    gameContainer.appendChild(canvasContainer);
    this.context = canvas.getContext("2d");
  }

  setupScoreDisplay() {
    console.log("setupScoreDisplay called"); // デバッグログ
    this.player1ScoreElement = this.findElement("player1-score");
    this.player2ScoreElement = this.findElement("player2-score");

    if (this.state.players && this.state.players.length > 0) {
      const player1Name = this.state.players[0]?.nickname || "Player 1";
      const player2Name = this.state.players[1]?.nickname || "Player 2";

      if (this.player1ScoreElement && this.player2ScoreElement) {
        this.player1ScoreElement.innerText = `${player1Name}: 0`;
        this.player2ScoreElement.innerText = `${player2Name}: 0`;
      }
    } else {
      console.error("No players found");
    }
  }

  updateScoreDisplay() {
    // スコアの数字だけを更新
    if (this.player1ScoreElement && this.player2ScoreElement) {
      this.player1ScoreElement.innerText = `${
        this.state.players[0]?.nickname || "Player 1"
      }: ${this.score.player1}`;
      this.player2ScoreElement.innerText = `${
        this.state.players[1]?.nickname || "Player 2"
      }: ${this.score.player2}`;
    }
  }

  setupControls() {
    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "w":
          this.paddle1.y = Math.max(this.paddle1.y - this.paddle1.speed, 0);
          break;
        case "s":
          this.paddle1.y = Math.min(
            this.paddle1.y + this.paddle1.speed,
            400 - this.paddle1.height
          );
          break;
        case "ArrowUp":
          this.paddle2.y = Math.max(this.paddle2.y - this.paddle2.speed, 0);
          break;
        case "ArrowDown":
          this.paddle2.y = Math.min(
            this.paddle2.y + this.paddle2.speed,
            400 - this.paddle2.height
          );
          break;
      }
    });
  }

  startGameLoop() {
    // ゲームループの開始
    const loop = () => {
      if (!this.isGameRunning) return; // ゲームが終了している場合はループを停止
      this.update(); // ゲームの状態を更新（ここで物理演算のみ行う）
      this.render(); // ゲームの描画
      this.animationFrameId = requestAnimationFrame(loop); // 次のフレームを要求（ここだけで管理）
    };
    this.animationFrameId = requestAnimationFrame(loop); // 最初のフレームをリクエスト
  }

  update() {
    if (!this.isGameRunning) {
      console.log("Game update skipped - Game not running");
      return;
    }

    // ボールの位置を更新
    this.ball.x += this.ball.speedX;
    this.ball.y += this.ball.speedY;

    // 上下の壁での反射
    if (this.ball.y <= 0 || this.ball.y >= 400) {
      this.ball.speedY *= -1;
    }

    // プレイヤー1のバーでの反射
    if (
      this.ball.x <= this.paddle1.x + this.paddle1.width &&
      this.ball.y >= this.paddle1.y &&
      this.ball.y <= this.paddle1.y + this.paddle1.height
    ) {
      this.ball.speedX *= -1;
    }

    // プレイヤー2のバーでの反射
    if (
      this.ball.x >= this.paddle2.x - this.ball.radius &&
      this.ball.y >= this.paddle2.y &&
      this.ball.y <= this.paddle2.y + this.paddle2.height
    ) {
      this.ball.speedX *= -1;
    }

    // ゴール判定
    if (this.ball.x < 0) {
      this.score.player2 += 1;
      this.updateScoreDisplay();
      this.checkForWinner();
      this.resetBall();
    } else if (this.ball.x > 800) {
      this.score.player1 += 1;
      this.updateScoreDisplay();
      this.checkForWinner();
      this.resetBall();
    }
  }

  checkForWinner() {
    const winningScore = 3;
    let winnerIndex = null;
    let maxScore = 0;

    this.state.players.forEach((player, index) => {
      const playerScore = index === 0 ? this.score.player1 : this.score.player2;
      if (playerScore >= winningScore && playerScore > maxScore) {
        maxScore = playerScore;
        winnerIndex = index;
      }
    });

    if (winnerIndex !== null) {
      const winner = this.state.players[winnerIndex];
      alert(`Player ${winner.nickname} wins!`);

      // ゲーム終了フラグを設定
      this.gameEnded = true;

      // 各プレイヤーのスコアを更新
      this.state.players.forEach((player, index) => {
        const score = index === 0 ? this.score.player1 : this.score.player2;
        this.updatePlayerScore(player.id, score);
      });

      // 確実に停止する
      this.stopGameLoop();

      // クリーンアップを実行
      if (this.cleanupFunction) {
        this.cleanupFunction();
      }

      // 結果ページに遷移する前に少し待つ（スコア更新APIが完了する時間）
      setTimeout(() => {
        this.router.goNextPage(`/result/${this.gameId}`);
      }, 1000); // 1秒待機に変更
    }
  }

  resetBall() {
    this.ball.x = 400;
    this.ball.y = 200;
    this.ball.speedX *= -1; // ボールの方向を反転
  }

  render() {
    this.context.clearRect(0, 0, 800, 400);
    this.context.fillStyle = "black";
    this.context.fillRect(0, 0, 800, 400);

    // ボールの描画
    this.context.fillStyle = "white";
    this.context.beginPath();
    this.context.arc(
      this.ball.x,
      this.ball.y,
      this.ball.radius,
      0,
      Math.PI * 2
    );
    this.context.fill();

    // プレイヤー1のバーの描画
    this.context.fillRect(
      this.paddle1.x,
      this.paddle1.y,
      this.paddle1.width,
      this.paddle1.height
    );

    // プレイヤー2のバーの描画
    this.context.fillRect(
      this.paddle2.x,
      this.paddle2.y,
      this.paddle2.width,
      this.paddle2.height
    );
  }

  get html() {
    return `
        <h1 style="text-align: center;">Pong Game</h1>
        <div style="text-align: center;">
            <span id="player1-score">Player 1: 0</span>
            <span> | </span>
            <span id="player2-score">Player 2: 0</span>
        </div>
        <p style="text-align: center;">Player 1: W, S</p>
        <p style="text-align: center;">Player 2: ↑, ↓</p>
        <div id="game-container"></div>
    `;
  }

  updatePlayerScore(playerId, score) {
    console.log(`Updating score for player ${playerId} to ${score}`);

    fetch(
      `/pong/api/update-player-score/?player_id=${playerId}&score=${score}`,
      {
        method: "POST",
        credentials: "include",
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          console.log(`Score updated successfully for player ${playerId}`);
          // スコア更新が成功したらカスタムイベントを発行
          const scoreUpdatedEvent = new CustomEvent("scoreUpdated", {
            detail: { gameId: this.gameId },
          });
          window.dispatchEvent(scoreUpdatedEvent);
        } else {
          console.error("Score update failed:", data.error);
        }
      })
      .catch((error) => {
        console.error("Error updating score:", error);
      });
  }
}
