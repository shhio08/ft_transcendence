import { Top } from "./components/top.js";
import { Login } from "./components/login.js";
import { Home } from "./components/home.js";
import { Game } from "./components/game.js";
import { Router } from "./core/router.js";

let router = new Router(
    document.getElementById("app"),
    [
        {
            path: "/",
            component: Top,
            state: {},
        },
        {
            path: "/login",
            component: Login,
            state: {},
        },
        {
            path: "/home",
            component: Home,
            state: {},
        },
        {
            path: "/game",
            component: Game,
            state: {},
        },
    ]
);

router.goNextPage(location.pathname);

window.onpopstate = () => {
    router.goNextPage(location.pathname);
};
