import { Component } from "../core/component.js";

export class Result extends Component {
    constructor(router, params, state) {
        super(router, params, state);
        this.winner = state.winner;
        this.render();
        this.findElement("back-home-button").onclick = () => {
            this.goNextPage('/home');
        };
    }

    get html() {
        return `
            <h1>Game Over</h1>
            <p>Congratulations, Player ${this.winner}!</p>
            <button id="back-home-button">Back to Home</button>
        `;
    }
} 