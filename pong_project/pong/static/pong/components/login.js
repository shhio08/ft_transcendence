import { Component } from "../core/component.js";

export class Login extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.render();
    this.state = { showTwoFactor: false, username: "" };
    this.setupEventListeners();
  }

  // イベントリスナーをセットアップする関数を追加
  setupEventListeners() {
    // ログインフォーム
    const loginForm = this.findElement("login-form");
    if (loginForm) {
      loginForm.onsubmit = (event) => {
        event.preventDefault();
        this.handleLogin();
      };
    }

    // 2FAフォーム
    const twoFactorForm = this.findElement("two-factor-form");
    if (twoFactorForm) {
      twoFactorForm.onsubmit = (e) => {
        e.preventDefault();
        this.handleLogin();
      };
    }

    // 42認証ボタン
    const fortyTwoAuthBtn = this.findElement("forty-two-auth");
    if (fortyTwoAuthBtn) {
      fortyTwoAuthBtn.onclick = () => this.handleFortyTwoAuth();
    }

    // 戻るボタン - 常にセットアップする
    const backBtn = this.findElement("back-to-top");
    if (backBtn) {
      backBtn.onclick = () => this.goBackToTop();
    }
  }

  // トップページに戻るメソッド
  goBackToTop() {
    // 2FAモードの場合は通常のログイン画面に戻る
    if (this.state.showTwoFactor) {
      this.state.showTwoFactor = false;
      this.render();
      this.setupEventListeners();
      return;
    }
    // それ以外はトップページに遷移
    this.goNextPage("/");
  }

  // 42認証処理を行うメソッド
  handleFortyTwoAuth() {
    // バックエンドAPIから認証用URLを取得
    fetch("/pong/api/get-42-auth-url/", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.auth_url) {
          window.location.href = data.auth_url;
        } else {
          alert("認証URLの取得に失敗しました");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("認証URLの取得中にエラーが発生しました");
      });
  }

  handleLogin() {
    // 2FAコード入力モードの場合
    if (this.state.showTwoFactor) {
      const code = this.findElement("two-factor-code").value;
      fetch("/pong/api/verify-2fa/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: this.state.username,
          code: code,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "success") {
            console.log(data.message);
            localStorage.setItem("authToken", data.token);
            this.goNextPage("/home");
          } else {
            alert(data.message || "Verification failed");
          }
        })
        .catch((error) => {
          console.log(error);
          alert("An error occurred during verification.");
        });
      return;
    }

    // 通常のログイン
    const username = this.findElement("username").value;
    const password = this.findElement("password").value;
    fetch("/pong/api/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // クッキーを送信・受信するために必要
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log(data.message);
          localStorage.setItem("authToken", data.token);
          this.goNextPage("/home");
        } else if (data.status === "requires_2fa") {
          // 2FA認証が必要な場合、2FAフォームを表示
          this.state.showTwoFactor = true;
          this.state.username = username;
          this.render();
          // 新しいレンダリング後にイベントリスナーを再設定
          this.setupEventListeners();
        } else {
          alert(data.message || "Login failed");
        }
      })
      .catch((error) => {
        console.log(error);
        alert("An error occurred during login.");
      });
  }

  get html() {
    if (this.state.showTwoFactor) {
      return `
        <div class="container d-flex flex-column justify-content-center align-items-center py-5">
          <header class="text-center mb-4">
            <h1 class="game-title neon-text">PING PONG</h1>
            <p class="neon-text-blue">TWO-FACTOR AUTHENTICATION</p>
          </header>
          
          <div class="arcade-machine p-4 w-100 max-width-700">
            <div class="game-area d-flex align-items-center justify-content-center p-4">
              <div class="text-center w-100">
                <h2 class="neon-text mb-4">VERIFICATION REQUIRED</h2>
                <p class="neon-text-blue mb-4">ENTER CODE FROM AUTHENTICATION APP</p>
                <form id="two-factor-form" class="text-center">
                  <div class="mb-4">
                    <input type="text" id="two-factor-code" name="code" required maxlength="6" pattern="[0-9]{6}"
                      class="form-control retro-input text-center w-75 mx-auto" placeholder="6-DIGIT CODE">
                  </div>
                  <button type="submit" class="neon-btn">VERIFY</button>
                </form>
                <div class="mt-4">
                  <button id="back-to-top" class="neon-btn btn-blue">BACK</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="container d-flex flex-column justify-content-center align-items-center py-5">
        <header class="text-center mb-4">
          <h1 class="game-title neon-text">PING PONG</h1>
          <p class="neon-text-blue">PLAYER LOGIN</p>
        </header>
        
        <div class="arcade-machine p-4 w-100 max-width-700">
          <div class="game-area d-flex align-items-center justify-content-center p-4">
            <div class="text-center w-100">
              <h2 class="neon-text mb-4">LOGIN</h2>
              <form id="login-form" class="text-center">
                <div class="mb-3">
                  <input type="text" id="username" name="username" required
                    class="form-control retro-input w-75 mx-auto" placeholder="USERNAME">
                </div>
                <div class="mb-4">
                  <input type="password" id="password" name="password" required
                    class="form-control retro-input w-75 mx-auto" placeholder="PASSWORD">
                </div>
                <div class="mb-3">
                  <button type="submit" class="neon-btn">LOGIN</button>
                </div>
              </form>
              <div class="mt-4 pt-3 border-top border-secondary">
                <button id="forty-two-auth" class="neon-btn btn-blue">LOGIN WITH 42</button>
              </div>
              <div class="mt-3">
                <button id="back-to-top" class="neon-btn">BACK</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
