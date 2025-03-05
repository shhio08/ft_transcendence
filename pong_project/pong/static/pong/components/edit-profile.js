import { Component } from "../core/component.js";

export class EditProfile extends Component {
  constructor(router, params, state) {
    super(router, params, state);
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
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          this.state.username = data.user.username || "";
          this.state.avatar = data.user.avatar || "";
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

  attachEventListeners() {
    this.findElement("save-button").onclick = () => {
      this.saveUserData();
    };
    this.findElement("cancel-button").onclick = () => {
      this.goNextPage("/home");
    };
    this.findElement("setup-2fa-button").onclick = () => {
      this.goNextPage("/two-factor-settings");
    };
  }

  saveUserData() {
    const token = localStorage.getItem("authToken");
    const formData = new FormData();
    formData.append("username", this.findElement("username-input").value);
    const avatarFile = this.findElement("avatar-input").files[0];
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    fetch("/pong/api/update-user-info/", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log("User data updated successfully");
          this.goNextPage("/home");
        } else {
          console.log(data.message);
        }
      })
      .catch((error) => {
        console.error("Error updating user data:", error);
      });
  }

  get html() {
    return `
      <div class="container py-5">
        <h2 class="neon-text text-center mb-5">EDIT PROFILE</h2>
        
        <div class="row justify-content-center">
          <!-- 左側：ユーザー情報 -->
          <div class="col-md-6 mb-4 mb-md-0">
            <!-- アバター表示 -->
            <div class="text-center mb-4">
              ${
                this.state.avatar
                  ? `<img src="${this.state.avatar}" alt="Current Avatar" class="player-profile-avatar mb-3">`
                  : `<div class="player-profile-avatar mb-3 mx-auto"></div>`
              }
            </div>
            
            <!-- ユーザー名入力 -->
            <div class="form-group mb-4">
              <label for="username-input" class="neon-text-blue d-block mb-2">USERNAME</label>
              <input type="text" id="username-input" class="form-control retro-input" 
                value="${this.state.username || ""}">
            </div>
            
            <!-- アバター更新 -->
            <div class="form-group">
              <label for="avatar-input" class="neon-text-blue d-block mb-2">CHANGE AVATAR</label>
              <input type="file" id="avatar-input" class="form-control retro-input">
            </div>
          </div>
          
          <!-- 右側：アクションと設定 -->
          <div class="col-md-4">
            <!-- セキュリティオプション -->
            <div class="mb-5">
              <h4 class="neon-text-blue mb-3">SECURITY OPTIONS</h4>
              <button id="setup-2fa-button" class="neon-btn btn-blue w-100">2FA SETUP</button>
            </div>
            
            <!-- アクションボタン -->
            <div class="mt-5 pt-3">
              <div class="d-grid gap-3">
                <button id="save-button" class="neon-btn w-100">SAVE</button>
                <button id="cancel-button" class="neon-btn w-100">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
