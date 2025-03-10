import { Component } from "../core/component.js";

export class OnlineMatching extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.socket = null;
    this.initWebSocket();
    this.addEventListeners();
  }

  initWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/pong/matchmaking/`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("WebSocket connected, sending match request");
      this.socket.send(
        JSON.stringify({
          type: "match_request",
          username: this.state.username,
        })
      );
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);

      if (data.type === "match_found") {
        // マッチング成功時の処理
        this.handleMatchFound(data);
      } else if (data.type === "match_status") {
        // 状態更新の処理
        this.updateMatchStatus(data.message);
      }
    };
  }

  handleMatchFound(data) {
    console.log("Match found:", data);

    // マッチング成功UIの更新
    const searchingView = document.getElementById("searching-view");
    const matchedView = document.getElementById("matched-view");
    searchingView.classList.add("d-none");
    matchedView.classList.remove("d-none");

    // 対戦相手の名前を表示
    document.getElementById("opponent-name").textContent =
      data.opponent.username;

    // サーバーから受け取ったゲーム情報を保存
    this.gameId = data.game_id;
    this.gameRoom = data.game_room;
    this.playerNumber = data.player_number;

    // 3秒後にゲーム画面へ遷移
    setTimeout(() => {
      this.goToGameScreen();
    }, 3000);
  }

  goToGameScreen() {
    const gameState = {
      username: this.state.username,
      gameId: this.gameId,
      gameRoom: this.gameRoom,
      playerNumber: this.playerNumber,
      remoteGame: true,
      opponent_name: document.getElementById("opponent-name").textContent,
    };
    this.goNextPage(`/remote-game/${this.gameId}`, gameState);
  }

  updateMatchStatus(message) {
    const statusElement = document.getElementById("match-status");
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  get html() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center h-100">
      <h2 class="neon-text-blue mb-5">MATCHING</h2>
      
      <div id="searching-view" class="text-center">
        <div class="spinner-border text-info mb-4"></div>
        <p id="match-status" class="neon-text-blue mb-5">Looking for an opponent...</p>
        <p class="text-warning mb-3">Please do not reload this page.</p>
        <button id="cancel-button" class="neon-btn btn-lg">CANCEL</button>
      </div>
      
      <div id="matched-view" class="d-none text-center">
        <p class="neon-text mb-4">
          ${this.state.username} VS <span id="opponent-name"></span>
        </p>
        <p class="neon-text-blue">Game starting soon...</p>
      </div>
    </div>
    `;
  }

  cleanup() {
    if (this.socket) {
      this.socket.close();
    }
  }

  addEventListeners() {
    this.findElement("cancel-button").onclick = () => {
      if (this.socket) {
        this.socket.close();
      }
      this.goNextPage("/home", {});
    };
  }
}
