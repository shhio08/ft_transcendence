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
      // WebSocket接続時の最低限のログ
      console.log("WebSocket接続確立");

      // リロードが検出された場合、WebSocket接続後にゲーム中断メッセージを送信
      if (this.isReload) {
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
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // 重要なイベントのみログ出力（game_state_updateとpaddle_moveは出力しない）
      if (
        data.type === "game_message" &&
        data.event !== "game_state_update" &&
        data.event !== "paddle_move"
      ) {
        console.log(`受信: ${data.event}`);
      }

      if (data.type === "game_message") {
        // ゲーム中断メッセージの処理を最優先
        if (data.event === "game_interrupted") {
          console.log("ゲーム中断理由:", data.reason);
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
          console.log(`プレイヤー${data.player_number}がゲームに参加`);
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
            this.ball.position.x = data.ball.x;
            this.ball.position.y = data.ball.y;
            this.ball.position.z = data.ball.z;
          }

          if (data.score) {
            this.score = data.score;
            this.updateScoreDisplay();
          }
        } else if (data.event === "game_start") {
          console.log("ゲーム開始");
          this.gameStarted = true;
        } else if (data.event === "game_end") {
          console.log("ゲーム終了, 勝者:", data.winner);
          if (!this.gameEnded) {
            this.gameEnded = true;
            this.handleGameEnd(data);
          }
        }
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket エラー");
    };

    this.socket.onclose = (event) => {
      console.log("WebSocket 接続終了");
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

    // ボール位置の更新を追加
    // this.updateBallPosition();

    // レンダリング
    this.render();
  }

  updatePaddlePosition() {
    // デバッグログを削除（アニメーションごとに出力されるのを防止）
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

    // パドルの移動範囲を拡大（テーブル端まで移動可能に）
    if (leftKey && myPaddle.position.x > -13) {
      myPaddle.position.x -= this.paddleSpeed;
      moved = true;
    }
    if (rightKey && myPaddle.position.x < 13) {
      myPaddle.position.x += this.paddleSpeed;
      moved = true;
    }

    // デバッグログを削除

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
    this.scene.background = new THREE.Color(0x0a0a16); // ウェブページの背景と同じ色に変更

    // カメラの設定 - 視野角を広げて位置を調整
    this.camera = new THREE.PerspectiveCamera(45, 800 / 500, 0.1, 1000);

    console.log(`プレイヤー${this.playerNumber}のカメラをセットアップ`);

    if (this.playerNumber === 1) {
      // プレイヤー1は手前側から見る - より遠くから
      this.camera.position.set(0, 16, 40);
      this.camera.lookAt(0, -2, 0); // 視点を少し下げる
    } else {
      // プレイヤー2は奥側から見る - より遠くから
      this.camera.position.set(0, 16, -40);
      this.camera.lookAt(0, -2, 0); // 視点を少し下げる
      // Y軸の向きを反転させない (up vectorは通常通り)
      this.camera.up.set(0, 1, 0);
    }

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

    // 光源の設定（テーブルに青い光を当てないよう調整）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // 光量を減らす
    this.scene.add(ambientLight);

    // より集中したスポットライトを使う（テーブル照らしすぎない）
    const spotLight = new THREE.SpotLight(0xffffff, 0.5);
    spotLight.position.set(0, 30, 0);
    spotLight.angle = Math.PI / 6; // 狭い角度
    spotLight.penumbra = 0.2;
    spotLight.distance = 80;
    spotLight.castShadow = false; // 影を作らない
    this.scene.add(spotLight);
  }

  createGameObjects() {
    this.createPaddles();
    this.createBall();
    this.createGameField();
  }

  createPaddles() {
    // パドルのジオメトリとマテリアル
    const paddleGeometry = new THREE.BoxGeometry(4, 0.5, 1);

    // 自分のパドル（ネオンレッド）- 発光効果を追加
    const myPaddleMaterial = new THREE.MeshPhongMaterial({
      color: 0xff0066, // 基本色（ネオンピンク/赤）
      emissive: 0xff0066, // 自己発光色
      emissiveIntensity: 0.7, // 発光強度
      shininess: 100, // 光沢
      specular: 0xffffff, // ハイライト色
    });

    // 相手のパドル（ネオンブルー）- 発光効果を追加
    const oppPaddleMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffff, // 基本色（ネオンシアン/青）
      emissive: 0x00ffff, // 自己発光色
      emissiveIntensity: 0.7, // 発光強度
      shininess: 100, // 光沢
      specular: 0xffffff, // ハイライト色
    });

    this.myPaddle = new THREE.Mesh(paddleGeometry, myPaddleMaterial);
    this.oppPaddle = new THREE.Mesh(paddleGeometry, oppPaddleMaterial);

    // パドルの初期位置設定 - テーブルの端に合わせる
    if (this.playerNumber === 1) {
      // プレイヤー1のパドルは手前側（正のZ方向）
      this.myPaddle.position.set(0, 0, 19.5); // テーブルの端に合わせる
      this.oppPaddle.position.set(0, 0, -19.5); // 反対側
    } else {
      // プレイヤー2のパドルは奥側（負のZ方向）
      this.myPaddle.position.set(0, 0, -19.5); // テーブルの端に合わせる
      this.oppPaddle.position.set(0, 0, 19.5); // 反対側
    }

    this.scene.add(this.myPaddle);
    this.scene.add(this.oppPaddle);
  }

  createGameField() {
    // テーブルを完全な真っ黒に変更（水色にならないよう材質を変更）
    const floorGeometry = new THREE.PlaneGeometry(30, 40);

    // 水色発光を防ぐため完全不透明な黒のマテリアルを使用
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000, // 純粋な黒
      side: THREE.DoubleSide,
      transparent: false,
      reflectivity: 0, // 反射なし
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2; // 水平に回転
    floor.position.y = 0; // 位置調整
    this.scene.add(floor);

    // ネオン管風の外枠（水色の光源として機能）
    const edgeGeometry = new THREE.BoxGeometry(30, 0.5, 40);
    const edgeMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000, // 黒ベース
      emissive: 0x00ffff, // シアン発光
      emissiveIntensity: 0.8, // 発光強度
      transparent: true,
      opacity: 0.9,
    });

    // フレーム作成（内側は黒く、エッジだけが光るようにする）
    const edgeWireframe = new THREE.BoxHelper(
      new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 40)),
      0x00ffff
    );
    edgeWireframe.material.transparent = true;
    edgeWireframe.material.opacity = 0.8;
    edgeWireframe.material.linewidth = 2;
    edgeWireframe.position.y = 0.1;
    this.scene.add(edgeWireframe);

    // 中央線（ネオン調の白）
    const centerLineGeometry = new THREE.PlaneGeometry(0.2, 40);
    const centerLineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
    });
    const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
    centerLine.rotation.x = Math.PI / 2;
    centerLine.position.y = 0.05; // 床より少し上に
    this.scene.add(centerLine);

    // デバッグ用：テーブルのサイズを表示（初期化時のみ）
    // console.log(
    //   "テーブルサイズ:",
    //   floorGeometry.parameters.width,
    //   "x",
    //   floorGeometry.parameters.height
    // );
  }

  createBall() {
    // ボールのジオメトリとマテリアル - ネオン風に変更
    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMaterial = new THREE.MeshPhongMaterial({
      color: 0xffff00, // 黄色
      emissive: 0xffff00, // 自己発光色も黄色
      emissiveIntensity: 0.7, // 発光強度
      shininess: 100, // 光沢
      specular: 0xffffff, // ハイライト
    });
    this.ball = new THREE.Mesh(ballGeometry, ballMaterial);

    // ボールの初期位置
    this.ball.position.set(0, 0.5, 0); // y座標を0.5に設定して床の上に配置

    // シーンにボールを追加
    this.scene.add(this.ball);

    // ボールの速度と方向の初期設定
    this.ballVelocity = {
      x: (Math.random() - 0.5) * 0.4, // -0.2から0.2の間のランダムな値
      z: this.playerNumber === 1 ? -0.3 : 0.3, // プレイヤー1は奥へ、プレイヤー2は手前へ
    };
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

  updateBallPosition() {
    // 前回のボール位置を保存
    const oldPosition = { ...this.ball.position };

    // ボールを移動
    this.ball.position.x += this.ballVelocity.x;
    this.ball.position.z += this.ballVelocity.z;

    // テーブルの左右の壁との衝突判定
    // テーブルの端（x = ±15）でボールが跳ね返るように変更
    if (this.ball.position.x <= -15 || this.ball.position.x >= 15) {
      this.ballVelocity.x = -this.ballVelocity.x;
      // ボールがテーブルの外に出ないよう位置を調整
      this.ball.position.x = this.ball.position.x > 0 ? 15 : -15;
    }

    // パドルとの衝突判定
    // プレイヤー1のパドル（手前側）
    const paddle1 = this.playerNumber === 1 ? this.myPaddle : this.oppPaddle;
    // プレイヤー2のパドル（奥側）
    const paddle2 = this.playerNumber === 1 ? this.oppPaddle : this.myPaddle;

    // パドル1（手前側）との衝突判定
    if (
      this.ball.position.z >= 20 &&
      oldPosition.z < 20 &&
      this.ball.position.x >= paddle1.position.x - 1 &&
      this.ball.position.x <= paddle1.position.x + 1
    ) {
      this.ballVelocity.z = -Math.abs(this.ballVelocity.z); // 必ず奥へ跳ね返る
      this.ballVelocity.x += (this.ball.position.x - paddle1.position.x) * 0.1; // パドルの当たった位置に応じて角度が変わる
      this.ball.position.z = 20; // パドルの手前に位置を修正
    }

    // パドル2（奥側）との衝突判定
    if (
      this.ball.position.z <= -20 &&
      oldPosition.z > -20 &&
      this.ball.position.x >= paddle2.position.x - 1 &&
      this.ball.position.x <= paddle2.position.x + 1
    ) {
      this.ballVelocity.z = Math.abs(this.ballVelocity.z); // 必ず手前へ跳ね返る
      this.ballVelocity.x += (this.ball.position.x - paddle2.position.x) * 0.1; // パドルの当たった位置に応じて角度が変わる
      this.ball.position.z = -20; // パドルの手前に位置を修正
    }

    // ゴール判定（相手側の端を超えた場合）
    if (this.ball.position.z < -20 || this.ball.position.z > 20) {
      this.resetBall();
      this.score += 1;
      this.updateScoreDisplay();
    }
  }
}
