import { Component } from "../core/component.js";

export class Signup extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.render();
    this.findElement("signup-form").onsubmit = (event) => {
      event.preventDefault();
      this.handleSignup();
    };

    // 戻るボタンにイベントリスナーを追加
    const backBtn = this.findElement("back-to-top");
    if (backBtn) {
      backBtn.onclick = () => this.goBackToTop();
    }
  }

  // トップページに戻るメソッド
  goBackToTop() {
    this.goNextPage("/");
  }

  handleSignup() {
    const formData = new FormData();
    formData.append("username", this.findElement("username").value);
    formData.append("email", this.findElement("email").value);
    formData.append("password", this.findElement("password").value);

    const avatarFile = this.findElement("avatar").files[0];
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    fetch("/pong/api/signup/", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log(data.message);
          localStorage.setItem("authToken", data.token);
          this.goNextPage("/home");
        } else {
          alert(data.message || "Sign up failed");
        }
      })
      .catch((error) => {
        console.log(error);
        alert("An error occurred during sign up.");
      });
  }

  get html() {
    return `
        <div class="container d-flex flex-column justify-content-center align-items-center py-5">
            <header class="text-center mb-4">
                <h1 class="game-title neon-text">PING PONG</h1>
                <p class="neon-text-blue">NEW PLAYER SIGNUP</p>
            </header>
            
            <div class="arcade-machine p-4 w-100 max-width-700">
                <div class="game-area d-flex align-items-center justify-content-center p-4">
                    <div class="text-center w-100">
                        <h2 class="neon-text mb-4">SIGN UP</h2>
                        <form id="signup-form" class="text-center">
                            <div class="mb-3">
                                <input type="text" id="username" name="username" required
                                    class="form-control retro-input w-75 mx-auto" placeholder="USERNAME">
                            </div>
                            <div class="mb-3">
                                <input type="email" id="email" name="email" required
                                    class="form-control retro-input w-75 mx-auto" placeholder="EMAIL">
                            </div>
                            <div class="mb-3">
                                <input type="password" id="password" name="password" required
                                    class="form-control retro-input w-75 mx-auto" placeholder="PASSWORD">
                            </div>
                            <div class="mb-4">
                                <label for="avatar" class="d-block text-center mb-2 neon-text-blue fs-6">AVATAR</label>
                                <input type="file" id="avatar" name="avatar" accept="image/*"
                                    class="form-control retro-input w-75 mx-auto">
                            </div>
                            <div class="mb-3">
                                <button type="submit" class="neon-btn">SIGN UP</button>
                            </div>
                        </form>
                        <div class="mt-3">
                            <button id="back-to-top" class="neon-btn btn-blue">BACK</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
  }
}
