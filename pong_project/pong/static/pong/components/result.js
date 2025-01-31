import { Component } from "../core/component.js";

export class Result extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.winner = state.winner;
        this.player1Score = state.player1Score;
        this.player2Score = state.player2Score;
        this.render();
        this.findElement("back-home-button").onclick = () => {
            this.resetGameState();
            this.goNextPage('/home');
        };
    }

    resetGameState() {
        // ゲームの状態を初期化
        this.winner = null;
        this.player1Score = 0;
        this.player2Score = 0;
    }

    get html() {
        return `
            <h1>Match Result</h1>
            <p>Final Scores:</p>
            <p>Player 1: ${this.player1Score}</p>
            <p>Player 2: ${this.player2Score}</p>
            <p>Congratulations to Player ${this.winner} for winning!</p>
            <button id="back-home-button">Return to Home</button>
        `;
    }
} 