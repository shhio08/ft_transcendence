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
          alert("Two-factor authentication has been enabled");
          this.goNextPage("/edit-profile");
        } else {
          alert(data.message || "Failed to verify code");
        }
      })
      .catch((error) => {
        console.error("Error confirming 2FA:", error);
        alert("An error occurred while confirming 2FA.");
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
          alert("Two-factor authentication has been disabled");
          this.goNextPage("/edit-profile");
        } else {
          alert(data.message || "Failed to disable two-factor authentication");
        }
      })
      .catch((error) => {
        console.error("Error disabling 2FA:", error);
        alert("An error occurred while disabling 2FA.");
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
      <div class="container py-3">
        <div class="row justify-content-center">
          <div class="col-md-6">
            <div class="p-3 text-center">
              <h2 class="neon-text mb-3">2FA SETUP</h2>
              <p class="mb-2">Scan this QR code with your authentication app:</p>
              
              <div class="mb-3 d-flex justify-content-center">
                <img src="data:image/png;base64,${this.state.qrCode}" alt="QR Code" class="img-fluid" style="max-width: 180px;">
              </div>
              
              <div class="mb-3">
                <p class="mb-1">Manual setup code:</p>
                <code class="d-block p-2 bg-dark text-white mb-2">${this.state.secret}</code>
              </div>
              
              <p class="mb-2">Enter 6-digit code from your app:</p>
              <div class="form-group mb-3">
                <input type="text" id="verification-code" class="form-control retro-input text-center" maxlength="6" pattern="[0-9]{6}" required>
              </div>
              
              <div class="d-flex gap-2 justify-content-center">
                <button id="confirm-button" class="neon-btn d-flex justify-content-center align-items-center">CONFIRM</button>
                <button id="back-button" class="neon-btn d-flex justify-content-center align-items-center">BACK</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
    } else if (this.state.has2fa) {
      return `
      <div class="container py-4">
        <div class="row justify-content-center">
          <div class="col-md-6">
            <div class="p-4 text-center">
              <h2 class="neon-text mb-3">2FA SETTINGS</h2>
              <p class="mb-3">To disable 2FA, enter your verification code:</p>
              
              <div class="form-group mb-3">
                <input type="text" id="disable-code" class="form-control retro-input text-center" maxlength="6" pattern="[0-9]{6}" required>
              </div>
              
              <div class="d-flex gap-2 justify-content-center">
                <button id="disable-2fa-button" class="neon-btn d-flex justify-content-center align-items-center">DISABLE 2FA</button>
                <button id="back-button" class="neon-btn d-flex justify-content-center align-items-center">BACK</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
    } else {
      return `
      <div class="container py-4">
        <div class="row justify-content-center">
          <div class="col-md-6">
            <div class="p-4 text-center">
              <h2 class="neon-text mb-3">2FA SECURITY</h2>
              <p class="mb-3">Enhance your account security with 2FA.</p>
              
              <div class="d-grid gap-2">
                <button id="setup-2fa-button" class="neon-btn d-flex justify-content-center align-items-center">SETUP 2FA</button>
                <button id="back-button" class="neon-btn d-flex justify-content-center align-items-center">BACK</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
    }
  }
}
