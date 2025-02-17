export class Router {
  constructor(rootElement, routes) {
    this.rootElement = rootElement;
    this.routes = routes;
    // popstate イベントをリッスンして、ページを更新
    window.addEventListener("popstate", (event) => {
      this.handlePopState(event);
    });
  }

  goNextPage(path, state = {}) {
    if (path === "/home" && !this.isLoggedIn()) {
      console.error("User not logged in");
      this.goNextPage("/login");
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
        ...route.state,
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
}
