import { Component } from "../core/component.js";

export class RemoteGame extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    console.log("Initial state:", state); // デバッグ用

    this.gameId = params.gameId;
    this.gameRoom = state.gameRoom;
    this.playerNumber = state.playerNumber;

    console.log(
      "Game setup - Player:",
      this.playerNumber,
      "Game ID:",
      this.gameId,
      "Game Room:",
      this.gameRoom
    );

    // リロード検出用のフラグをURLに保存
    if (!window.location.href.includes("reload=true")) {
      // 初回アクセス時: リロードマーカーなしの場合
      this.isFirstLoad = true;
      // セッションストレージに現在のゲーム情報を保存
      if (this.gameId && this.playerNumber) {
        sessionStorage.setItem("activeGameId", this.gameId);
        sessionStorage.setItem("activeGameRoom", this.gameRoom);
        sessionStorage.setItem("activePlayerNumber", this.playerNumber);
      }
    } else {
      // リロードされた場合
      this.isFirstLoad = false;
      console.log("Reload detected via URL parameter");
      // 現在のURLからリロードパラメータを削除（連続リロード対策）
      const cleanUrl = window.location.href
        .replace("reload=true", "")
        .replace(/[&?]$/, "");
      window.history.replaceState({}, document.title, cleanUrl);

      // 即座にホームに戻るようにする
      alert("ゲームが中断されました。リロードによりゲームが終了します。");
      window.location.href = "/home";
      return; // コンストラクタの残りを実行しない
    }

    if (!this.gameId || !this.playerNumber) {
      console.error("Missing required game data");
      window.location.href = "/home";
      return;
    }

    this.keys = {
      ArrowLeft: false,
      ArrowRight: false,
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.paddle1 = null;
    this.paddle2 = null;
    this.ball = null;

    // パドルの移動速度
    this.paddleSpeed = 0.3;

    // スコア
    this.score = { player1: 0, player2: 0 };

    // ゲーム状態
    this.gameStarted = false;
    this.gameEnded = false;
    this.winnerDeclared = false; // アラート表示済みフラグ
    this.lastUpdateTime = 0;

    // プレイヤー情報
    this.players = {
      1: { name: "プレイヤー1", score: 0 },
      2: { name: "プレイヤー2", score: 0 },
    };

    // プレイヤーデータ読み込み
    this.loadPlayerData();

    this.initGame();
    this.initializeWebSocket();
    this.setupControls();

    // クリーンアップ関数の登録
    if (this.router && this.router.registerCleanup) {
      this.router.registerCleanup(() => this.cleanup());
    }

    // ビジビリティ変更イベントリスナー
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  handleVisibilityChange() {
    if (document.hidden) {
      // タブが非表示になったらアニメーションを一時停止
      this.pauseGame();
    } else if (!this.gameEnded) {
      // タブが表示されてゲームが終了していなければ再開
      this.resumeGame();
    }
  }

  pauseGame() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resumeGame() {
    if (!this.animationFrameId && !this.gameEnded) {
      this.animate();
    }
  }

  initializeWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/pong/game/`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("WebSocket connection established");

      // リロードが検出された場合、WebSocket接続後にゲーム中断メッセージを送信
      if (this.isReload) {
        console.log("Sending game_interrupted message due to reload");
        this.socket.send(
          JSON.stringify({
            type: "game_interrupted",
            game_id: this.gameRoom,
            player_number: this.playerNumber,
            reason: "reload",
          })
        );

        // 少し待ってからリダイレクト（メッセージが確実に送信されるようにするため）
        setTimeout(() => {
          alert("ゲームが中断されました。リロードによりゲームが終了します。");
          window.location.href = "/home";
        }, 500);
        return; // 以降のコードを実行しない
      }

      // 通常のゲーム参加
      this.socket.send(
        JSON.stringify({
          type: "join_game",
          game_id: this.gameRoom,
          player_number: this.playerNumber,
        })
      );
      console.log(
        `Sent join_game message for room ${this.gameRoom} as player ${this.playerNumber}`
      );
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);

      if (data.type === "game_message") {
        // ゲーム中断メッセージの処理を最優先
        if (data.event === "game_interrupted") {
          console.log("Game interrupted! Reason:", data.reason);
          this.gameEnded = true;

          // 確実に処理が実行されるように即時アラートを表示
          alert(
            `ゲームが中断されました。理由: ${
              data.reason || "不明"
            }。ホームに戻ります。`
          );

          // 直接リダイレクト（確実に実行されるように）
          window.location.href = "/home";
          return; // 以降の処理をスキップ
        }

        // その他のメッセージ処理
        if (data.event === "player_joined") {
          console.log(`Player ${data.player_number} joined the game`);
        } else if (data.event === "paddle_move") {
          const playerNumber = data.player_number;
          const position = data.position;

          // 相手のパドル位置を更新
          if (playerNumber !== this.playerNumber) {
            if (playerNumber === 1) {
              this.paddle1.position.x = position;
            } else if (playerNumber === 2) {
              this.paddle2.position.x = position;
            }
          }
        } else if (data.event === "game_state_update") {
          // サーバーからのゲーム状態更新を処理
          if (data.ball) {
            console.log("Ball position updated:", data.ball);
            this.ball.position.x = data.ball.x;
            this.ball.position.y = data.ball.y;
            this.ball.position.z = data.ball.z;
          }

          if (data.score) {
            console.log("Score updated:", data.score);
            this.score = data.score;
            this.updateScoreDisplay();
          }
        } else if (data.event === "game_start") {
          console.log("Game started");
          this.gameStarted = true;
        } else if (data.event === "game_end") {
          console.log("Game ended, winner:", data.winner);
          if (!this.gameEnded) {
            this.gameEnded = true;
            this.handleGameEnd(data);
          }
        }
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
    };
  }

  setupControls() {
    // キーが押された時
    document.addEventListener("keydown", (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = true;
      }
    });

    // キーが離された時
    document.addEventListener("keyup", (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = false;
      }
    });

    // アニメーションループの開始
    this.animate();
  }

  animate() {
    if (this.gameEnded) {
      this.pauseGame();
      return; // ゲームが終了したらアニメーションを停止
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // パドル位置の更新
    this.updatePaddlePosition();

    // レンダリング
    this.render();
  }

  updatePaddlePosition() {
    // デバッグログを追加
    console.log(
      `updatePaddlePosition - Player: ${this.playerNumber}, Keys:`,
      this.keys
    );

    let moved = false;
    const myPaddle = this.myPaddle;

    // 基本的な移動処理（プレイヤー1はそのまま）
    let leftKey = this.keys.ArrowLeft;
    let rightKey = this.keys.ArrowRight;

    // プレイヤー2の場合は左右キーを入れ替える
    if (this.playerNumber === 2) {
      let temp = leftKey;
      leftKey = rightKey;
      rightKey = temp;
    }

    // 実際の移動処理（両プレイヤー共通）
    if (leftKey && myPaddle.position.x > -8) {
      myPaddle.position.x -= this.paddleSpeed;
      moved = true;
    }
    if (rightKey && myPaddle.position.x < 8) {
      myPaddle.position.x += this.paddleSpeed;
      moved = true;
    }

    // デバッグログ
    if (moved) {
      console.log(`Paddle moved to: ${myPaddle.position.x}`);
    }

    if (moved && this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = {
        type: "paddle_move",
        game_id: this.gameRoom,
        player_number: this.playerNumber,
        position: myPaddle.position.x,
      };
      this.socket.send(JSON.stringify(message));
    }
  }

  initGame() {
    this.setupScene();
    this.createGameObjects();
    this.render();
  }

  setupScene() {
    // シーンの作成
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // カメラの設定
    this.camera = new THREE.PerspectiveCamera(40, 800 / 500, 0.1, 1000);

    console.log(`Setting up camera for player ${this.playerNumber}`);

    if (this.playerNumber === 1) {
      // プレイヤー1は手前側から見る
      this.camera.position.set(0, 15, 32);
      this.camera.lookAt(0, 0, 0); // シーンの中心を見る
    } else {
      // プレイヤー2は奥側から見る
      this.camera.position.set(0, 15, -32);
      this.camera.lookAt(0, 0, 0); // シーンの中心を見る
      // Y軸の向きを反転させない (up vectorは通常通り)
      this.camera.up.set(0, 1, 0);
    }

    console.log(`Camera position: ${JSON.stringify(this.camera.position)}`);
    console.log(`Camera up vector: ${JSON.stringify(this.camera.up)}`);

    // レンダラーの設定
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(800, 500);

    // ゲームコンテナにレンダラーを追加
    const container = this.findElement("game-container");
    if (container) {
      container.appendChild(this.renderer.domElement);
    } else {
      console.error("Game container not found");
    }

    // 光源の設定
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(0, 15, 0);
    this.scene.add(pointLight);
  }

  createGameObjects() {
    // パドル1（プレイヤー1のパドル - 常に手前側）
    const paddle1Geometry = new THREE.BoxGeometry(4, 1, 1);
    const paddle1Material = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    this.paddle1 = new THREE.Mesh(paddle1Geometry, paddle1Material);
    this.paddle1.position.set(0, 0.5, 15);

    // パドル2（プレイヤー2のパドル - 常に奥側）
    const paddle2Geometry = new THREE.BoxGeometry(4, 1, 1);
    const paddle2Material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    this.paddle2 = new THREE.Mesh(paddle2Geometry, paddle2Material);
    this.paddle2.position.set(0, 0.5, -15);

    this.scene.add(this.paddle1);
    this.scene.add(this.paddle2);

    // 自分が操作するパドルを設定
    this.myPaddle = this.playerNumber === 1 ? this.paddle1 : this.paddle2;

    // ボール
    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
    this.ball.position.set(0, 1, 0);
    this.scene.add(this.ball);

    // シンプルなゲームフィールド
    this.createGameField();
  }

  createGameField() {
    // シンプルな床
    const floorGeometry = new THREE.PlaneGeometry(30, 40);
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2; // 水平に回転
    floor.position.y = 0;
    this.scene.add(floor);

    // 中央線（シンプルな線）
    const centerLineGeometry = new THREE.PlaneGeometry(0.1, 30);
    const centerLineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
    centerLine.rotation.x = Math.PI / 2;
    centerLine.position.y = 0.01;
    this.scene.add(centerLine);
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) {
      console.error("Cannot render: missing renderer, scene or camera");
      return;
    }

    try {
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.error("Error during rendering:", error);
    }
  }

  cleanup() {
    console.log("Cleaning up remote game component");

    // ゲーム状態をクリア
    this.gameEnded = true;

    // アニメーションフレームをキャンセル
    this.pauseGame();

    // WebSocketを閉じる
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close();
    }

    // DOM要素をクリア
    if (this.renderer && this.renderer.domElement) {
      const container = this.findElement("game-container");
      if (container && container.contains(this.renderer.domElement)) {
        container.removeChild(this.renderer.domElement);
      }
    }

    // イベントリスナーを削除
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
    document.removeEventListener("keydown", (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = true;
      }
    });
    document.removeEventListener("keyup", (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = false;
      }
    });

    // beforeunloadイベントリスナーを削除
    window.removeEventListener("beforeunload", () => this.beforeUnload());

    // セッションストレージをクリア
    sessionStorage.removeItem("gameActive");

    console.log("Remote game cleanup complete");
  }

  get html() {
    return `
      <div id="game-container">
        <div id="score-display" style="position: absolute; top: 10px; left: 0; right: 0; text-align: center; color: white; z-index: 1000; font-size: 24px;"></div>
      </div>
    `;
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
          // プレイヤー情報を更新
          data.players.forEach((player) => {
            if (player.player_number) {
              this.players[player.player_number] = {
                name: player.user_name || `プレイヤー${player.player_number}`,
                score: 0,
              };
            }
          });

          console.log("Player data loaded:", this.players);
          this.updateScoreDisplay(); // プレイヤー情報が読み込まれたらスコア表示を更新
        }
      })
      .catch((error) => {
        console.error("Error loading player data:", error);
      });
  }

  handleGameEnd(data) {
    // ゲーム終了時の処理
    this.gameEnded = true;
    const winnerNumber = data.winner;
    const isWinner = winnerNumber === this.playerNumber;

    // 結果画面を表示
    this.declareWinner(winnerNumber);
  }

  declareWinner(winner) {
    if (this.winnerDeclared) return; // 既に宣言済みなら何もしない

    console.log(`Declaring winner: Player ${winner}`);
    this.winnerDeclared = true;

    // アニメーションを停止
    this.pauseGame();

    // 勝者の名前を取得
    let winnerName = "";
    if (winner === this.playerNumber) {
      // 自分が勝者の場合
      winnerName = this.state.username;
    } else {
      // 相手が勝者の場合
      winnerName = this.state.opponent_name;
    }

    setTimeout(() => {
      alert(`${winnerName} wins!`);

      // リザルトページに遷移
      setTimeout(() => {
        console.log(`Game finished, going to result page: ${this.gameId}`);
        this.router.goNextPage(`/result/${this.gameId}`);
      }, 1000);
    }, 100);
  }

  updateScoreDisplay() {
    const scoreElement = this.findElement("score-display");
    if (scoreElement) {
      // 自分と相手のプレイヤー番号を特定
      const myPlayerNum = this.playerNumber;
      const opponentPlayerNum = myPlayerNum === 1 ? 2 : 1;

      // 名前とスコアを取得
      const myName = this.state.username;
      const myScore = this.score[`player${myPlayerNum}`] || 0;
      const opponentName = this.state.opponent_name;
      const opponentScore = this.score[`player${opponentPlayerNum}`] || 0;

      scoreElement.innerHTML = `
        <span class="neon-text-blue">${myName}: ${myScore}</span> | 
        <span class="neon-text">${opponentName}: ${opponentScore}</span>
      `;
    }
  }

  beforeUnload() {
    // ページを離れる前にゲーム中断通知を送信
    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN &&
      !this.gameEnded
    ) {
      this.socket.send(
        JSON.stringify({
          type: "game_interrupted",
          game_id: this.gameRoom,
          player_number: this.playerNumber,
          reason: "navigation",
        })
      );
      console.log("Sent game_interrupted message before unload");
    }

    // セッションストレージをクリア
    sessionStorage.removeItem("gameActive");
  }

  // ページが破棄される前に呼ばれるイベントハンドラを登録
  afterRender() {
    super.afterRender();

    // プレイヤー情報を明示的に更新
    const playerInfoElement = this.findElement("player-info");
    if (playerInfoElement) {
      playerInfoElement.textContent = `Player ${this.playerNumber} | Game ID: ${this.gameId}`;
    }

    // リロード検出と通知
    window.addEventListener("beforeunload", (event) => {
      if (!this.gameEnded && this.gameRoom && this.playerNumber) {
        // 1. セッションストレージにリロード情報を記録
        sessionStorage.setItem("gameReloading", "true");

        // 2. リロード先のURLにフラグを追加
        const reloadUrl =
          window.location.href +
          (window.location.href.includes("?") ? "&" : "?") +
          "reload=true";

        // 3. sendBeaconを使用して非同期データ送信（WebSocketではなくHTTPで）
        const notifyUrl = "/pong/api/notify-game-interrupted/";
        const data = JSON.stringify({
          game_id: this.gameRoom,
          player_number: this.playerNumber,
          reason: "reload",
        });

        // Beaconでサーバーに通知（WebSocketよりも確実に送信される）
        navigator.sendBeacon(
          notifyUrl,
          new Blob([data], { type: "application/json" })
        );

        console.log("Notified server about reload using sendBeacon");

        // ページをリロード（sendBeaconは非同期なので先に進む）
        // フラグ付きのURLにリダイレクト
        if (sessionStorage.getItem("gameReloading") === "true") {
          // リロードと通常の遷移を区別するため、わずかに遅延させる
          setTimeout(() => {
            window.location.href = reloadUrl;
          }, 0);
        }
      }
    });
  }
}
