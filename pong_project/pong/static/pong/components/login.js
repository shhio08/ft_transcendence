import { Component } from "../core/component.js";

export class Login extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.render();
    this.state = { showTwoFactor: false, username: "" };
    this.findElement("login-form").onsubmit = (event) => {
      event.preventDefault();
      this.handleLogin();
    };
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
          // 2FAフォームのサブミットイベントを設定
          this.findElement("two-factor-form").onsubmit = (e) => {
            e.preventDefault();
            this.handleLogin();
          };
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
                <h1>二要素認証</h1>
                <p>認証アプリのコードを入力してください</p>
                <form id="two-factor-form">
                    <label for="two-factor-code">Authentication Code:</label>
                    <input type="text" id="two-factor-code" name="code" required maxlength="6" pattern="[0-9]{6}">
                    <button type="submit">検証</button>
                </form>
            `;
    }

    return `
            <h1>Login</h1>
            <form id="login-form">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
                <br>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
                <br>
                <button type="submit">Login</button>
            </form>
        `;
  }
}
