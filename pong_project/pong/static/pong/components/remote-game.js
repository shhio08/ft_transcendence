import { Component } from "../core/component.js";

export class RemoteGame extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.socket = null;
    this.gameStarted = false;
    this.gameId = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.connectGameWebSocket();
    this.attachEventListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.closeWebSocket();
  }

  connectGameWebSocket() {
    // WebSocket接続を確立
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/pong/game/`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("ゲームWebSocket接続が確立されました");

      // ゲーム開始リクエストを送信
      this.socket.send(
        JSON.stringify({
          type: "join_game",
          username: this.state.username,
          opponent: this.state.opponent.username,
        })
      );
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("ゲームWebSocketからメッセージを受信:", data);

      if (data.type === "game_start") {
        this.handleGameStart(data);
      }
      // 他のゲームイベントの処理はこちら（後で実装）
    };

    this.socket.onclose = () => {
      console.log("ゲームWebSocket接続が閉じられました");
    };

    this.socket.onerror = (error) => {
      console.error("ゲームWebSocketエラー:", error);
    };
  }

  closeWebSocket() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }

  handleGameStart(data) {
    this.gameStarted = true;
    this.gameId = data.game_id;

    // ゲーム開始の表示
    this.findElement("waiting-message").classList.add("hidden");
    this.findElement("game-container").classList.remove("hidden");

    // ここでゲームのレンダリングや初期化を行う（後で実装）
    console.log("ゲームが開始されました。ID:", this.gameId);
  }

  attachEventListeners() {
    this.findElement("quit-game-button").onclick = () => {
      if (confirm("ゲームを終了しますか？")) {
        this.handleQuitGame();
      }
    };
  }

  handleQuitGame() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "quit_game",
          game_id: this.gameId,
        })
      );
    }
    this.goNextPage("/home");
  }

  get html() {
    return `
    <div class="container py-5 d-flex flex-column justify-content-center align-items-center">
      <div class="row w-100">
        <div class="col-12">
          <div class="remote-game-container p-4">
            <div class="game-header d-flex justify-content-between align-items-center mb-4">
              <div class="player-info d-flex align-items-center">
                <img src="${
                  this.state.avatar || "/static/pong/images/avatar-default.jpg"
                }" 
                     alt="Your Avatar" class="avatar-mini me-2">
                <span class="neon-text">${this.state.username}</span>
              </div>
              
              <div class="vs-badge mx-3">VS</div>
              
              <div class="player-info d-flex align-items-center">
                <img src="${
                  this.state.opponent?.avatar ||
                  "/static/pong/images/avatar-default.jpg"
                }" 
                     alt="Opponent Avatar" class="avatar-mini me-2">
                <span class="neon-text">${
                  this.state.opponent?.username || "対戦相手"
                }</span>
              </div>
              
              <button id="quit-game-button" class="neon-btn ms-auto">退出</button>
            </div>
            
            <div id="waiting-message" class="text-center mb-4">
              <p class="neon-text-blue">ゲームの準備中...</p>
              <div class="loading-spinner"></div>
            </div>
            
            <div id="game-container" class="game-container hidden">
              <!-- ここにゲームキャンバスが配置されます -->
              <div class="game-canvas-placeholder">
                <p class="neon-text-blue">ゲーム画面がここに表示されます</p>
                <p class="neon-text-small">（実際のゲーム機能は後で実装予定）</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
  }
}
