import { Component } from "../core/component.js";

export class Top extends Component {
  constructor(router, params, state) {
    super(router, params, state);
    this.render();
    this.findElement("go-login").onclick = () => {
      this.goLogin();
    };
    this.findElement("go-signup").onclick = () => {
      this.goSignup();
    };
  }

  goLogin() {
    this.goNextPage("/login");
  }

  goSignup() {
    this.goNextPage("/signup");
  }

  get html() {
    return `
        <div class="container retro-container">
            <header class="text-center mb-4">
                <h1 class="game-title neon-text flicker-text">PING PONG</h1>
                <p class="neon-text-blue">LOGIN OR SIGN UP TO PLAY</p>
            </header>
            
            <div class="arcade-machine">
                <div class="game-area">
                    <div class="text-center px-3">
                        <h2 class="neon-text mb-4">WELCOME TO PONG</h2>
                        <p class="neon-text-blue">THE CLASSIC ARCADE GAME</p>
                        <div class="button-container">
                            <button id="go-login" class="neon-btn">LOGIN</button>
                            <button id="go-signup" class="neon-btn btn-blue">SIGN UP</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
  }
}
