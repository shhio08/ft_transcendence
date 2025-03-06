import { Component } from "../core/component.js";

// グローバル変数としてテスト用のログを出力
console.log("OnlineMatching.js file loaded");

export class OnlineMatching extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    console.log("OnlineMatching constructor called");
    this.socket = null;
    this.isMatched = false;
    this.matchedUser = null;
    this.countdown = 3;
    this.countdownInterval = null;

    // コンストラクタでWebSocket初期化を試みる
    console.log("Initializing WebSocket from constructor");
    this.initWebSocket();

    // イベントリスナーも設定する
    setTimeout(() => {
      console.log("Trying to attach event listeners");
      this.attachEventListeners();
    }, 500);

    // 状態確認用のログを追加
    console.log("状態:", {
      router: !!router,
      params: params,
      state: state,
      element: this.element,
    });
  }

  connectedCallback() {
    console.log("connectedCallback called - BEFORE super.connectedCallback()");
    super.connectedCallback();
    console.log("connectedCallback called - AFTER super.connectedCallback()");

    // DOMへの接続が完了したかを確認
    console.log("this.element exists:", !!this.element);

    // 非同期処理として実行（遅延を長めに）
    setTimeout(() => {
      console.log("Delayed initialization running");
      this.initWebSocket();
      this.attachEventListeners();
    }, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.closeWebSocket();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  initWebSocket() {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/pong/matchmaking/`;

      console.log(`Attempting WebSocket connection to: ${wsUrl}`);

      this.socket = new WebSocket(wsUrl);
      console.log(`WebSocket created, readyState: ${this.socket.readyState}`);

      this.socket.onopen = this.onWebSocketOpen;
      this.socket.onmessage = this.onWebSocketMessage;
      this.socket.onclose = this.onWebSocketClose;
      this.socket.onerror = this.onWebSocketError;

      console.log("WebSocket event handlers attached");
    } catch (error) {
      console.error("Error initializing WebSocket:", error);
    }
  }

  onWebSocketOpen = () => {
    console.log("WebSocket connection established successfully");
    const message = {
      type: "match_request",
      username: this.state.username,
      avatar: this.state.avatar,
    };
    console.log(`Sending match request: ${JSON.stringify(message)}`);
    this.socket.send(JSON.stringify(message));
  };

  onWebSocketMessage = (event) => {
    console.log(`Raw message received: ${event.data}`);
    const data = JSON.parse(event.data);
    console.log("Parsed message:", data);

    switch (data.type) {
      case "match_found":
        console.log(`Match found with opponent: ${data.opponent.username}`);
        this.handleMatchFound(data);
        break;
      case "match_status":
        console.log(`Match status update: ${data.message}`);
        this.updateMatchStatus(data);
        break;
      default:
        console.log(`Unhandled message type: ${data.type}`, data);
    }
  };

  onWebSocketClose = (event) => {
    console.log(
      `WebSocket connection closed: code=${event.code}, reason=${event.reason}, clean=${event.wasClean}`
    );
  };

  onWebSocketError = (error) => {
    console.error("WebSocket error occurred:", error);
    this.updateMatchStatus({ message: "Connection error" });
  };

  closeWebSocket() {
    if (this.socket) {
      console.log(
        `Closing WebSocket, current state: ${this.socket.readyState}`
      );
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
        console.log("WebSocket close requested");
      }
    }
    this.socket = null;
    console.log("WebSocket reference cleared");
  }

  attachEventListeners() {
    this.findElement("cancel-button").onclick = () => {
      console.log("Cancel button clicked");
      // マッチングのキャンセルメッセージを送信
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "cancel_matching" }));
      }
      this.closeWebSocket();
      this.goNextPage("/home");
    };
  }

  handleMatchFound(data) {
    this.isMatched = true;
    this.matchedUser = data.opponent;

    // マッチング成功ビューに切り替え
    const searchingView = document.getElementById("searching-view");
    const matchedView = document.getElementById("matched-view");

    if (searchingView && matchedView) {
      searchingView.classList.add("d-none");
      matchedView.classList.remove("d-none");

      // 対戦相手の名前を表示
      const opponentName = document.getElementById("opponent-name");
      if (opponentName) {
        opponentName.textContent = data.opponent.username;
      }

      // カウントダウン開始
      this.startCountdown();
    }
  }

  startCountdown() {
    const countdownElement = document.getElementById("countdown");
    if (!countdownElement) return;

    countdownElement.textContent = this.countdown;

    this.countdownInterval = setInterval(() => {
      this.countdown -= 1;
      countdownElement.textContent = this.countdown;

      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        // ゲーム画面に遷移
        this.goToGameScreen();
      }
    }, 1000);
  }

  goToGameScreen() {
    const gameState = {
      username: this.state.username,
      avatar: this.state.avatar,
      opponent: this.matchedUser,
      remoteGame: true,
      gameRoom: this.gameRoom,
    };

    this.goNextPage("/remote-game", gameState);
  }

  updateMatchStatus(data) {
    const statusElement = document.getElementById("match-status");
    if (statusElement) {
      statusElement.textContent = data.message || "Looking for an opponent...";
    }
  }

  get html() {
    return `
    <div class="d-flex flex-column justify-content-center align-items-center h-100">
      <h2 class="neon-text-blue mb-5" style="font-size: 1.8rem;">MATCHING</h2>
      
      <!-- マッチング検索中の表示 -->
      <div id="searching-view" class="text-center">
        <div class="spinner-border text-info mb-4" role="status"></div>
        <p id="match-status" class="neon-text-blue mb-5" style="font-size: 1.2rem;">Looking for an opponent...</p>
        
        <div class="d-grid gap-3 mt-4">
          <button id="cancel-button" class="neon-btn btn-lg">CANCEL</button>
        </div>
      </div>
      
      <!-- マッチング成功時の表示 -->
      <div id="matched-view" class="d-none text-center">
        <p class="neon-text mb-4" style="font-size: 1.2rem;">
          ${this.state.username} VS <span id="opponent-name"></span>
        </p>
        
        <p class="neon-text-blue mb-2">Game starts in</p>
        <div id="countdown" class="neon-text-blue mb-4" style="font-size: 3rem;">3</div>
      </div>
    </div>
    `;
  }

  // このメソッドは必ず呼ばれるはずなので確認用
  render() {
    console.log("render method called");
    return super.render();
  }

  // HTML要素にアクセスできる最初のポイント
  afterRender() {
    console.log("afterRender called");
    if (this.element) {
      console.log("DOM element exists in afterRender");
      const testElem = document.createElement("div");
      testElem.textContent = "OnlineMatching component rendered!";
      testElem.style.color = "red";
      testElem.style.fontWeight = "bold";
      this.element.prepend(testElem);

      // ここでもWebSocketの初期化を試みる
      console.log("Trying to initialize WebSocket from afterRender");
      this.initWebSocket();
      this.attachEventListeners();
    } else {
      console.error("DOM element does not exist in afterRender");
    }
  }

  // afterPageLoadedは他のコンポーネントと同様に実装
  afterPageLoaded = () => {
    console.log("afterPageLoaded called");
    // 別の方法でWebSocketが初期化されていない場合に実行
    if (!this.socket) {
      this.initWebSocket();
    }
  };
}
