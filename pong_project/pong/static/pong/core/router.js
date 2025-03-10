export class Router {
  constructor(rootElement, routes) {
    this.rootElement = rootElement;
    this.routes = routes;
    this.cleanupFunctions = [];
    this.publicPaths = ["/", "/login", "/signup", "/oauth/callback"]; // 認証不要のパス
    // popstate イベントをリッスンして、ページを更新
    window.addEventListener("popstate", (event) => {
      this.handlePopState(event);
    });
  }

  registerCleanup(cleanupFunction) {
    this.cleanupFunctions.push(cleanupFunction);
  }

  goNextPage(path, state = {}) {
    // 認証チェック
    if (!this.isPublicPath(path) && !this.isLoggedIn()) {
      console.log("Unauthorized access, redirecting to top page");
      this.navigateToPath("/", state);
      return;
    }

    this.navigateToPath(path, state);
  }

  // 認証不要のパスかどうかをチェック
  isPublicPath(path) {
    return this.publicPaths.some((publicPath) => path === publicPath);
  }

  // 実際のページ遷移処理
  navigateToPath(path, state = {}) {
    this.executeCleanup();

    // ゲーム結果ページへのアクセスを特別に処理
    if (
      path.startsWith("/result/") ||
      path.startsWith("/tournament/") ||
      path.startsWith("/remote-game/") ||
      path.startsWith("/online-matching") ||
      path.startsWith("/game/")
    ) {
      if (!this.isLoggedIn()) {
        console.log(
          "Unauthorized access to result page, redirecting to top page"
        );
        history.pushState({}, "", "/");
        this.goNextPage("/");
        return;
      } else {
        console.log("Redirecting logged-in user to home");
        history.pushState({}, "", "/home");
        this.goNextPage("/home");
        return;
      }
    }

    // 通常の認証チェック
    if (!this.isPublicPath(path) && !this.isLoggedIn()) {
      console.log("Unauthorized access, redirecting to top page");
      history.pushState({}, "", "/");
      this.goNextPage("/");
      return;
    }

    const route = this.matchRoute(path);
    if (route) {
      if (
        this.currentComponent &&
        typeof this.currentComponent.destroy === "function"
      ) {
        this.currentComponent.destroy(); // 現在のコンポーネントを破棄
      }
      this.rootElement.innerHTML = ""; // 既存のコンテンツをクリア
      const component = new route.component(this, route.params, {
        ...(route.state || {}), // route.stateがundefinedの場合に備える
        ...state,
      });
      this.rootElement.appendChild(component.element); // 新しいコンポーネントを追加
      this.currentComponent = component; // 現在のコンポーネントを更新
      history.pushState({}, "", path); // パスを変更
    } else {
      console.error("Route not found");
    }
  }

  matchRoute(path) {
    for (const route of this.routes) {
      const paramNames = [];
      const regexPath = route.path.replace(/:([^/]+)/g, (_, key) => {
        paramNames.push(key);
        return "([^/]+)";
      });
      const match = path.match(new RegExp(`^${regexPath}$`));
      if (match) {
        const params = paramNames.reduce((acc, name, index) => {
          acc[name] = match[index + 1];
          return acc;
        }, {});
        return { ...route, params };
      }
    }
    return null;
  }

  // popstate イベントのハンドラ
  handlePopState(event) {
    const path = window.location.pathname;
    const route = this.matchRoute(path);
    if (route) {
      const component = new route.component(this, route.params, route.state);
      this.rootElement.innerHTML = ""; // 既存のコンテンツをクリア
      this.rootElement.appendChild(component.element); // 新しいコンポーネントを追加
    } else {
      console.error("Route not found");
    }
  }

  isLoggedIn() {
    // トークンが存在するか確認
    return !!localStorage.getItem("authToken");
  }

  executeCleanup() {
    // すべてのクリーンアップ関数を実行
    while (this.cleanupFunctions.length > 0) {
      const cleanup = this.cleanupFunctions.pop();
      if (typeof cleanup === "function") {
        try {
          cleanup();
        } catch (error) {
          console.error("Error during cleanup:", error);
        }
      }
    }
  }
}
