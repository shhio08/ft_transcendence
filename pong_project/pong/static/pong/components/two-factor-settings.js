import { Component } from "../core/component.js";

export class TwoFactorSettings extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.state = {
      step: "initial",
      qrCode: null,
      secret: null,
    };
    this.loadUserData();
  }

  loadUserData() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found");
      this.goNextPage("/login");
      return;
    }

    fetch("/pong/api/user-info/", {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          this.state.user = data.user;
          this.state.has2fa = data.user.two_factor_enabled;
          this.render();
          this.attachEventListeners();
        } else {
          console.log(data.message);
          this.goNextPage("/login");
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        this.goNextPage("/login");
      });
  }

  setupTwoFactor() {
    const token = localStorage.getItem("authToken");
    fetch("/pong/api/setup-2fa/", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          this.state.step = "setup";
          this.state.qrCode = data.qr_code;
          this.state.secret = data.secret;
          this.render();
          this.attachEventListeners();
        } else {
          alert(data.message || "Failed to setup 2FA");
        }
      })
      .catch((error) => {
        console.error("Error setting up 2FA:", error);
        alert("An error occurred during 2FA setup.");
      });
  }

  confirmTwoFactor() {
    const code = this.findElement("verification-code").value;
    const token = localStorage.getItem("authToken");

    fetch("/pong/api/confirm-2fa/", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          alert("2要素認証が有効になりました");
          this.goNextPage("/edit-profile");
        } else {
          alert(data.message || "コードの検証に失敗しました");
        }
      })
      .catch((error) => {
        console.error("Error confirming 2FA:", error);
        alert("2FAの確認中にエラーが発生しました。");
      });
  }

  disableTwoFactor() {
    const code = this.findElement("disable-code").value;
    const token = localStorage.getItem("authToken");

    fetch("/pong/api/disable-2fa/", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          alert("2要素認証が無効になりました");
          this.goNextPage("/edit-profile");
        } else {
          alert(data.message || "2要素認証の無効化に失敗しました");
        }
      })
      .catch((error) => {
        console.error("Error disabling 2FA:", error);
        alert("2FAの無効化中にエラーが発生しました。");
      });
  }

  attachEventListeners() {
    if (this.state.step === "initial" && !this.state.has2fa) {
      this.findElement("setup-2fa-button").onclick = () => {
        this.setupTwoFactor();
      };
    } else if (this.state.step === "setup") {
      this.findElement("confirm-button").onclick = () => {
        this.confirmTwoFactor();
      };
    } else if (this.state.has2fa) {
      this.findElement("disable-2fa-button").onclick = () => {
        this.disableTwoFactor();
      };
    }

    this.findElement("back-button").onclick = () => {
      this.goNextPage("/edit-profile");
    };
  }

  get html() {
    if (this.state.step === "setup") {
      return `
                <h1>2要素認証のセットアップ</h1>
                <p>以下のQRコードを認証アプリでスキャンするか、コードを手動で入力してください：</p>
                <img src="data:image/png;base64,${this.state.qrCode}" alt="QR Code" width="200" height="200">
                <p>手動設定コード: <code>${this.state.secret}</code></p>
                <p>認証アプリに表示される6桁のコードを入力して確認してください：</p>
                <input type="text" id="verification-code" maxlength="6" pattern="[0-9]{6}" required>
                <button id="confirm-button">確認</button>
                <button id="back-button">戻る</button>
            `;
    } else if (this.state.has2fa) {
      return `
                <h1>2要素認証の設定</h1>
                <p>2要素認証は現在有効です。無効にするには認証コードを入力してください：</p>
                <input type="text" id="disable-code" maxlength="6" pattern="[0-9]{6}" required>
                <button id="disable-2fa-button">2要素認証を無効にする</button>
                <button id="back-button">戻る</button>
            `;
    } else {
      return `
                <h1>2要素認証の設定</h1>
                <p>アカウントのセキュリティを強化するために2要素認証を有効にすることをお勧めします。</p>
                <button id="setup-2fa-button">2要素認証を設定する</button>
                <button id="back-button">戻る</button>
            `;
    }
  }
}
