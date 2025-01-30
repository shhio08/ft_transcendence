export class Router {
    constructor(rootElement, routes) {
        this.rootElement = rootElement;
        this.routes = routes;
        // popstate イベントをリッスンして、ページを更新
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });
    }

    goNextPage(path) {
        const route = this.routes.find(r => r.path === path);
        if (route) {
            const component = new route.component(this, {}, route.state);
            this.rootElement.innerHTML = ''; // 既存のコンテンツをクリア
            this.rootElement.appendChild(component.element); // 新しいコンポーネントを追加
            history.pushState({}, '', path); // パスを変更
        } else {
            console.error('Route not found');
        }
    }

    // popstate イベントのハンドラ
    handlePopState(event) {
        const path = window.location.pathname;
        const route = this.routes.find(r => r.path === path);
        if (route) {
            const component = new route.component(this, {}, route.state);
            this.rootElement.innerHTML = ''; // 既存のコンテンツをクリア
            this.rootElement.appendChild(component.element); // 新しいコンポーネントを追加
        } else {
            console.error('Route not found');
        }
    }
}