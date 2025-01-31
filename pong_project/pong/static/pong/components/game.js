import { Component } from "../core/component.js";

export class Game extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.isGameRunning = true;
        this.initGame();
    }

    initGame() {
        this.score = { player1: 0, player2: 0 };
        this.ball = { x: 400, y: 200, radius: 10, speedX: 2, speedY: 2 };
        this.paddle1 = { x: 10, y: 150, width: 10, height: 100, speed: 5 };
        this.paddle2 = { x: 780, y: 150, width: 10, height: 100, speed: 5 };
        this.setupCanvas();
        this.setupScoreDisplay();
        this.setupControls();
        this.startGameLoop();
    }

    setupCanvas() {
        // キャンバスの設定
		const gameContainer = this.findElement('game-container');
		if (!gameContainer) {
			console.error("Game container element not found");
			return;
		}
        const canvasContainer = document.createElement('div');
        canvasContainer.style.display = 'flex';
        canvasContainer.style.justifyContent = 'center';
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvasContainer.appendChild(canvas);
		gameContainer.appendChild(canvasContainer);
        this.context = canvas.getContext('2d');
    }

    setupScoreDisplay() {
        // スコアを表示する要素を取得
        this.player1ScoreElement = this.findElement('player1-score');
        this.player2ScoreElement = this.findElement('player2-score');
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        // スコアを更新
        if (this.player1ScoreElement && this.player2ScoreElement) {
            this.player1ScoreElement.innerText = `Player 1: ${this.score.player1}`;
            this.player2ScoreElement.innerText = `Player 2: ${this.score.player2}`;
        }
    }

    setupControls() {
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'w':
                    this.paddle1.y = Math.max(this.paddle1.y - this.paddle1.speed, 0);
                    break;
                case 's':
                    this.paddle1.y = Math.min(this.paddle1.y + this.paddle1.speed, 400 - this.paddle1.height);
                    break;
                case 'ArrowUp':
                    this.paddle2.y = Math.max(this.paddle2.y - this.paddle2.speed, 0);
                    break;
                case 'ArrowDown':
                    this.paddle2.y = Math.min(this.paddle2.y + this.paddle2.speed, 400 - this.paddle2.height);
                    break;
            }
        });
    }

    startGameLoop() {
        // ゲームループの開始
        const loop = () => {
            if (!this.isGameRunning) return; // ゲームが終了している場合はループを停止
            this.update();  // ゲームの状態を更新
            this.render();  // ゲームの描画
            requestAnimationFrame(loop);  // 次のフレームを要求
        };
        loop();
    }

    update() {
        // ボールの位置を更新
        this.ball.x += this.ball.speedX;
        this.ball.y += this.ball.speedY;

        // 上下の壁での反射
        if (this.ball.y <= 0 || this.ball.y >= 400) {
            this.ball.speedY *= -1;
        }

        // プレイヤー1のバーでの反射
        if (this.ball.x <= this.paddle1.x + this.paddle1.width &&
            this.ball.y >= this.paddle1.y &&
            this.ball.y <= this.paddle1.y + this.paddle1.height) {
            this.ball.speedX *= -1;
        }

        // プレイヤー2のバーでの反射
        if (this.ball.x >= this.paddle2.x - this.ball.radius &&
            this.ball.y >= this.paddle2.y &&
            this.ball.y <= this.paddle2.y + this.paddle2.height) {
            this.ball.speedX *= -1;
        }

        // ゴール判定
        if (this.ball.x < 0) {
            this.score.player2 += 1;
            this.updateScoreDisplay();
            this.checkForWinner();
            this.resetBall();
        } else if (this.ball.x > 800) {
            this.score.player1 += 1;
            this.updateScoreDisplay();
            this.checkForWinner();
            this.resetBall();
        }
    }

    checkForWinner() {
        if (this.score.player1 >= 3 || this.score.player2 >= 3) {
            const winner = this.score.player1 >= 3 ? '1' : '2';
            alert(`Player ${winner} wins!`);
            this.isGameRunning = false; // ゲームを停止
            this.router.goNextPage('/result', { 
                winner, 
                player1Score: this.score.player1, 
                player2Score: this.score.player2 
            });
        }
    }

    resetBall() {
        this.ball.x = 400;
        this.ball.y = 200;
        this.ball.speedX *= -1; // ボールの方向を反転
    }

    render() {
        this.context.clearRect(0, 0, 800, 400);
        this.context.fillStyle = 'black';
        this.context.fillRect(0, 0, 800, 400);

        // ボールの描画
        this.context.fillStyle = 'white';
        this.context.beginPath();
        this.context.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.context.fill();

        // プレイヤー1のバーの描画
        this.context.fillRect(this.paddle1.x, this.paddle1.y, this.paddle1.width, this.paddle1.height);

        // プレイヤー2のバーの描画
        this.context.fillRect(this.paddle2.x, this.paddle2.y, this.paddle2.width, this.paddle2.height);
    }

    get html() {
        return `
            <h1 style="text-align: center;">Pong Game</h1>
            <div style="text-align: center;">
                <span id="player1-score">Player 1: 0</span>
                <span> | </span>
                <span id="player2-score">Player 2: 0</span>
            </div>
            <p style="text-align: center;">Player 1: W, S</p>
            <p style="text-align: center;">Player 2: ↑, ↓</p>
            <div id="game-container"></div>
        `;
    }

}