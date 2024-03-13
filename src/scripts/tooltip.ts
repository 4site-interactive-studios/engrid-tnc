import tippy from "tippy.js";

export class Tooltip {
  private Els: NodeListOf<HTMLElement>;

  constructor() {
    this.Els = document.querySelectorAll("[data-engrid-tooltip]");
    if (!this.shouldRun()) return;
    this.addTooltips();
  }

  private shouldRun() {
    return this.Els.length > 0;
  }

  private addTooltips() {
    this.Els.forEach((el) => {
      const content = el.getAttribute("data-engrid-tooltip");
      const trigger = el.getAttribute("data-engrid-tooltip-trigger") || "click";

      if (!content) return;

      tippy(el, {
        content: content,
        theme: "light-border",
        allowHTML: true,
        trigger: trigger,
        hideOnClick: "toggle",
      });
    });
  }
}
