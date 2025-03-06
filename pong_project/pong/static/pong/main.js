import { Top } from "./components/top.js";
import { Login } from "./components/login.js";
import { Home } from "./components/home.js";
import { Game } from "./components/game.js";
import { Result } from "./components/result.js";
import { Signup } from "./components/signup.js";
import { Router } from "./core/router.js";
import { EditProfile } from "./components/edit-profile.js";
import { LocalGameOptions } from "./components/local-game-options.js";
import { FriendList } from "./components/friend_list.js";
import { TwoFactorSettings } from "./components/two-factor-settings.js";
import { OAuthCallback } from "./components/oauth-callback.js";
import { Tournament } from "./components/tournament.js";
import { OnlineMatching } from "./components/online-matching.js";
import { RemoteGame } from "./components/remote-game.js";

let router = new Router(document.getElementById("app"), [
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
    path: "/game/:gameId",
    component: Game,
    state: {},
  },
  {
    path: "/result/:gameId",
    component: Result,
    state: {},
  },
  {
    path: "/signup",
    component: Signup,
    state: {},
  },
  {
    path: "/edit-profile",
    component: EditProfile,
    state: {},
  },
  {
    path: "/friend-list",
    component: FriendList,
    state: {},
  },
  {
    path: "/local-game-options",
    component: LocalGameOptions,
    state: {},
  },
  {
    path: "/two-factor-settings",
    component: TwoFactorSettings,
    state: {},
  },
  {
    path: "/oauth/callback",
    component: OAuthCallback,
    state: {},
  },
  {
    path: "/tournament/:tournamentId",
    component: Tournament,
    state: {},
  },
  {
    path: "/online-matching",
    component: OnlineMatching,
    state: {},
  },
  {
    path: "/remote-game",
    component: RemoteGame,
    state: {},
  },
]);

router.goNextPage(location.pathname);

window.onpopstate = () => {
  router.goNextPage(location.pathname);
};
