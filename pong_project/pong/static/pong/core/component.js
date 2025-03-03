export class Component {
  constructor(router, parameters, state) {
    this.router = router;
    this.parameters = parameters;
    this.state = state;
    this.element = this.createElementFromHTML(this.html, this.containerTag);
    this.element.classList.add("component");
  }

  createElementFromHTML(htmlString, containerTag = "div") {
    const container = document.createElement(containerTag);
    container.innerHTML = htmlString.trim();
    return container;
  }

  findElement(selector) {
    return this.element.querySelector(`#${selector}`);
  }

  goNextPage(path, state = {}) {
    this.router.goNextPage(path, state); // 汎用的なページ遷移メソッド
  }

  render() {
    this.element.innerHTML = this.html;
  }
}
