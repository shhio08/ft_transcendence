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
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          console.error(data.error);
        } else if (data.players && data.players.length > 0) {
          this.state.players = data.players;

          // プレイヤー数を更新
          this.playerCount = this.state.players.length;

          // プレイヤー数に基づきパドルを設定
          this.setupPaddles();

          // 4人プレイの場合、UI要素を表示
          if (this.playerCount >= 4) {
            const controlsElement = this.findElement("four-player-controls");
            if (controlsElement) controlsElement.style.display = "block";

            const fourPlayerContainer = this.findElement(
              "four-player-container"
            );
            if (fourPlayerContainer)
              fourPlayerContainer.style.display = "block";
          }

          this.setupScoreDisplay();
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
    this.score = { player1: 0, player2: 0, player3: 0, player4: 0 };
    this.balls = [];

    // デフォルトは2人プレイ
    this.playerCount = 2;

    // 基本パドル (2人プレイ用)
    this.paddle1 = { x: 10, y: 150, width: 10, height: 100, speed: 5 };
    this.paddle2 = { x: 780, y: 150, width: 10, height: 100, speed: 5 };

    // 4人プレイ用のパドル（初期は未定義）
    this.paddle3 = null;
    this.paddle4 = null;

    this.loadGameOptions(() => {
      this.setupCanvas();
      this.setupControls();
      this.initBalls();
      this.startGameLoop();
    });
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
    console.log("setupScoreDisplay called");
    this.player1ScoreElement = this.findElement("player1-score");
    this.player2ScoreElement = this.findElement("player2-score");
    this.player3ScoreElement = this.findElement("player3-score");
    this.player4ScoreElement = this.findElement("player4-score");

    if (this.state.players && this.state.players.length > 0) {
      const player1Name = this.state.players[0]?.nickname || "Player 1";
      const player2Name =
        this.state.players.length > 1
          ? this.state.players[1]?.nickname || "Player 2"
          : "Player 2";

      if (this.player1ScoreElement && this.player2ScoreElement) {
        this.player1ScoreElement.innerText = `${player1Name}: 0`;
        this.player2ScoreElement.innerText = `${player2Name}: 0`;
      }

      // 4人プレイの場合は追加プレイヤーのスコア表示
      if (
        this.playerCount >= 4 &&
        this.player3ScoreElement &&
        this.player4ScoreElement
      ) {
        const player3Name =
          this.state.players.length > 2
            ? this.state.players[2]?.nickname || "Player 3"
            : "Player 3";
        const player4Name =
          this.state.players.length > 3
            ? this.state.players[3]?.nickname || "Player 4"
            : "Player 4";

        this.player3ScoreElement.innerText = `${player3Name}: 0`;
        this.player4ScoreElement.innerText = `${player4Name}: 0`;

        // 4人プレイ用に表示
        this.findElement("four-player-container").style.display = "block";
      } else {
        // 2人プレイでは非表示
        if (this.findElement("four-player-container")) {
          this.findElement("four-player-container").style.display = "none";
        }
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

      // 4人プレイの場合は追加プレイヤーのスコアも更新
      if (
        this.playerCount >= 4 &&
        this.player3ScoreElement &&
        this.player4ScoreElement
      ) {
        this.player3ScoreElement.innerText = `${
          this.state.players[2]?.nickname || "Player 3"
        }: ${this.score.player3}`;
        this.player4ScoreElement.innerText = `${
          this.state.players[3]?.nickname || "Player 4"
        }: ${this.score.player4}`;
      }
    }
  }

  setupControls() {
    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        // プレイヤー1のコントロール (左上)
        case "w":
          this.paddle1.y = Math.max(this.paddle1.y - this.paddle1.speed, 0);
          break;
        case "s":
          this.paddle1.y = Math.min(
            this.paddle1.y + this.paddle1.speed,
            400 - this.paddle1.height
          );
          break;

        // プレイヤー2のコントロール (右上)
        case "ArrowUp":
          this.paddle2.y = Math.max(this.paddle2.y - this.paddle2.speed, 0);
          break;
        case "ArrowDown":
          this.paddle2.y = Math.min(
            this.paddle2.y + this.paddle2.speed,
            400 - this.paddle2.height
          );
          break;

        // 4人プレイの場合のみ追加のコントロール
        case "e":
          if (this.paddle3) {
            this.paddle3.y = Math.max(this.paddle3.y - this.paddle3.speed, 0);
          }
          break;
        case "d":
          if (this.paddle3) {
            this.paddle3.y = Math.min(
              this.paddle3.y + this.paddle3.speed,
              400 - this.paddle3.height
            );
          }
          break;
        case "i":
          if (this.paddle4) {
            this.paddle4.y = Math.max(this.paddle4.y - this.paddle4.speed, 0);
          }
          break;
        case "k":
          if (this.paddle4) {
            this.paddle4.y = Math.min(
              this.paddle4.y + this.paddle4.speed,
              400 - this.paddle4.height
            );
          }
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

    // 各ボールを更新
    for (let ballIndex = 0; ballIndex < this.balls.length; ballIndex++) {
      const ball = this.balls[ballIndex];

      // ボールの位置を更新
      ball.x += ball.speedX;
      ball.y += ball.speedY;

      // 上下の壁での反射
      if (ball.y <= 0 || ball.y >= 400) {
        ball.speedY *= -1;
      }

      // プレイヤー1のバーでの反射
      if (
        ball.x <= this.paddle1.x + this.paddle1.width &&
        ball.y >= this.paddle1.y &&
        ball.y <= this.paddle1.y + this.paddle1.height
      ) {
        ball.speedX *= -1;
      }

      // プレイヤー2のバーでの反射
      if (
        ball.x >= this.paddle2.x - ball.radius &&
        ball.y >= this.paddle2.y &&
        ball.y <= this.paddle2.y + this.paddle2.height
      ) {
        ball.speedX *= -1;
      }

      // 4人プレイの場合、追加パドルとの衝突判定
      if (this.playerCount >= 4) {
        // プレイヤー3のバーでの反射 (左下)
        if (
          ball.x <= this.paddle3.x + this.paddle3.width &&
          ball.y >= this.paddle3.y &&
          ball.y <= this.paddle3.y + this.paddle3.height
        ) {
          ball.speedX *= -1;
        }

        // プレイヤー4のバーでの反射 (右下)
        if (
          ball.x >= this.paddle4.x - ball.radius &&
          ball.y >= this.paddle4.y &&
          ball.y <= this.paddle4.y + this.paddle4.height
        ) {
          ball.speedX *= -1;
        }
      }

      // ゴール判定
      if (ball.x < 0) {
        // 左側のプレイヤーが逃した場合、右側のプレイヤーにポイントを与える
        if (this.playerCount >= 4) {
          // ボールの位置によって得点者を決定 (上下で分ける)
          if (ball.y < 200) {
            this.score.player2 += 1; // 右上のプレイヤーに得点
          } else {
            this.score.player4 += 1; // 右下のプレイヤーに得点
          }
        } else {
          this.score.player2 += 1;
        }
        this.updateScoreDisplay();
        this.checkForWinner();
        this.resetBall(ballIndex);
      } else if (ball.x > 800) {
        // 右側のプレイヤーが逃した場合、左側のプレイヤーにポイントを与える
        if (this.playerCount >= 4) {
          // ボールの位置によって得点者を決定 (上下で分ける)
          if (ball.y < 200) {
            this.score.player1 += 1; // 左上のプレイヤーに得点
          } else {
            this.score.player3 += 1; // 左下のプレイヤーに得点
          }
        } else {
          this.score.player1 += 1;
        }
        this.updateScoreDisplay();
        this.checkForWinner();
        this.resetBall(ballIndex);
      }
    }
  }

  checkForWinner() {
    const winningScore = 3;
    let winnerIndex = null;
    let maxScore = 0;

    this.state.players.forEach((player, index) => {
      // 各プレイヤーのスコアを取得
      let playerScore = 0;
      if (index === 0) playerScore = this.score.player1;
      else if (index === 1) playerScore = this.score.player2;
      else if (index === 2) playerScore = this.score.player3;
      else if (index === 3) playerScore = this.score.player4;

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
        let score = 0;
        if (index === 0) score = this.score.player1;
        else if (index === 1) score = this.score.player2;
        else if (index === 2) score = this.score.player3;
        else if (index === 3) score = this.score.player4;

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

  resetBall(ballIndex) {
    const ball = this.balls[ballIndex];
    ball.x = 400;
    ball.y = 200 + ballIndex * 50;
    ball.speedX *= -1; // ボールの方向を反転
  }

  render() {
    this.context.clearRect(0, 0, 800, 400);
    this.context.fillStyle = "black";
    this.context.fillRect(0, 0, 800, 400);

    // ボールの描画
    this.context.fillStyle = "white";
    for (const ball of this.balls) {
      this.context.beginPath();
      this.context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.context.fill();
    }

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

    // 4人プレイモードの場合、追加パドル描画
    if (this.playerCount >= 4 && this.paddle3 && this.paddle4) {
      // プレイヤー3のバー描画
      this.context.fillRect(
        this.paddle3.x,
        this.paddle3.y,
        this.paddle3.width,
        this.paddle3.height
      );

      // プレイヤー4のバー描画
      this.context.fillRect(
        this.paddle4.x,
        this.paddle4.y,
        this.paddle4.width,
        this.paddle4.height
      );
    }

    // 中央線の描画（4人モードで視覚的に上下を分けるため）
    if (this.playerCount >= 4) {
      this.context.setLineDash([5, 5]);
      this.context.beginPath();
      this.context.moveTo(0, 200);
      this.context.lineTo(800, 200);
      this.context.strokeStyle = "white";
      this.context.stroke();
      this.context.setLineDash([]);
    }
  }

  get html() {
    return `
        <h1 style="text-align: center;">Pong Game</h1>
        <div style="text-align: center;">
            <span id="player1-score">Player 1: 0</span>
            <span> | </span>
            <span id="player2-score">Player 2: 0</span>
        </div>
        <div id="four-player-container" style="text-align: center; display: none;">
            <span id="player3-score">Player 3: 0</span>
            <span> | </span>
            <span id="player4-score">Player 4: 0</span>
        </div>
        <div style="text-align: center; margin-top: 10px;">
            <p>Player 1: W, S &nbsp;&nbsp; Player 2: ↑, ↓</p>
            <p id="four-player-controls" style="display: none;">Player 3: E, D &nbsp;&nbsp; Player 4: I, K</p>
        </div>
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

  // 新しいメソッド: ゲームオプションの読み込み
  loadGameOptions(callback) {
    fetch(`/pong/api/get-game-options/?game_id=${this.gameId}`, {
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Game options:", data);
        this.gameOptions = {
          ballCount: data.ball_count || 1,
          ballSpeed: data.ball_speed || "normal",
        };

        // 4人プレイの場合、コントロール表示
        if (this.state.players && this.state.players.length >= 4) {
          const controlsElement = this.findElement("four-player-controls");
          if (controlsElement) {
            controlsElement.style.display = "block";
          }
        }

        callback();
      })
      .catch((error) => {
        console.error("Error loading game options:", error);
        // デフォルト値を設定
        this.gameOptions = {
          ballCount: 1,
          ballSpeed: "normal",
        };
        callback();
      });
  }

  // 新しいメソッド: ボールの初期化
  initBalls() {
    // ボールの速度を設定
    let speedFactor = 1;
    switch (this.gameOptions.ballSpeed) {
      case "slow":
        speedFactor = 0.7;
        break;
      case "normal":
        speedFactor = 1;
        break;
      case "fast":
        speedFactor = 1.5;
        break;
      default:
        speedFactor = 1;
    }

    // ボールを初期化
    for (let i = 0; i < this.gameOptions.ballCount; i++) {
      const speedX = 12 * speedFactor * (i % 2 === 0 ? 1 : -1); // 2つ目のボールは逆方向に
      const speedY = 12 * speedFactor * (i % 2 === 0 ? 1 : -1);

      this.balls.push({
        x: 400,
        y: 200 + i * 50, // ボールの初期位置をずらす
        radius: 10,
        speedX: speedX,
        speedY: speedY,
      });
    }
  }

  // 新しいメソッド: プレイヤー数に応じてパドルを設定
  setupPaddles() {
    // 4人プレイの場合、追加パドルを初期化
    if (this.playerCount >= 4) {
      this.paddle3 = { x: 10, y: 250, width: 10, height: 100, speed: 5 };
      this.paddle4 = { x: 780, y: 250, width: 10, height: 100, speed: 5 };
    }
  }

  // 4人プレイか確認するヘルパーメソッド
  isFourPlayerMode() {
    return this.state.players && this.state.players.length >= 4;
  }
}
