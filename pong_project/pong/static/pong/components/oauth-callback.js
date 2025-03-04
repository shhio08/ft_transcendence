import { Component } from "../core/component.js";

export class OAuthCallback extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.render();
    this.handleCallback();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const backButton = this.findElement("back-to-login");
    if (backButton) {
      backButton.onclick = () => this.handleBackToLogin();
    }
  }

  handleCallback() {
    // URLからcodeパラメータを取得
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (!code) {
      this.state.error = "認証コードが見つかりません。";
      this.render();
      return;
    }

    // バックエンドへコードを送信
    fetch("/pong/api/oauth/42/callback/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("OAuth callback response:", data); // レスポンスデータをログ出力

        if (data.status === "success") {
          localStorage.setItem("authToken", data.token);

          //   // ユーザー情報も保存（必要に応じて）
          //   if (data.user) {
          //     localStorage.setItem("userData", JSON.stringify(data.user));
          //   }

          this.goNextPage("/home");
        } else {
          this.state.error = data.message || "認証に失敗しました。";
          this.render();
        }
      })
      .catch((error) => {
        console.error("Error during OAuth callback:", error);
        this.state.error = "認証処理中にエラーが発生しました。";
        this.render();
      });
  }

  handleBackToLogin() {
    this.goNextPage("/login");
  }

  get html() {
    if (this.state.error) {
      return `
        <h1>認証エラー</h1>
        <p>${this.state.error}</p>
        <button id="back-to-login">ログインに戻る</button>
      `;
    }
    return `
      <h1>認証中...</h1>
      <p>しばらくお待ちください...</p>
    `;
  }
}
