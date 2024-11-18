import { EngridLogger, ENGrid } from "@4site/engrid-scripts";
import { trackEvent } from "./tracking";

export class WidgetProgressBar {
  private logger: EngridLogger = new EngridLogger(
    "WidgetProgressBar",
    "black",
    "yellow",
    "🍫"
  );
  private widget = document.querySelector(
    ".en__component--widgetblock"
  ) as HTMLDivElement;
  private increase = 1.25;
  private threshold = 80;

  constructor() {
    if (!this.shouldRun()) {
      this.logger.log("Not running");
      return;
    }
    const widget = document.querySelector(
      ".enWidget--progressBar"
    ) as HTMLDivElement;
    if (widget && widget.querySelector(".raised-remaining")) {
      this.logger.log("Widget found via querySelector");
      this.run(widget);
    } else {
      this.addMutationObserver();
    }
  }
  private addMutationObserver() {
    // Watch for changes to the widget, until an element with the class "enWidget--progressBar" is found
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.addedNodes.length &&
          (mutation.addedNodes[0] as HTMLDivElement).querySelector(".remaining")
        ) {
          observer.disconnect();
          // There's an additional script that runs after the widget is added to the DOM, so we need to wait a bit before running our code
          window.setTimeout(() => {
            this.logger.log("Widget found via MutationObserver");
            this.widget = document.querySelector(
              ".enWidget--progressBar"
            ) as HTMLDivElement;
            this.run(this.widget);
          }, 150);
          return;
        }
      });
    });
    observer.observe(this.widget, {
      childList: true,
      subtree: true,
    });
  }
  private run(widget: HTMLDivElement) {
    const fill = widget.querySelector(".enWidget__fill") as HTMLDivElement;
    const percentage = fill ? parseInt(fill.style.width, 10) : 0;
    this.logger.log("Percentage", percentage);
    if (percentage >= this.threshold) {
      this.logger.log("Incrementing goal");
      const supporters = parseInt(
        widget
          .querySelector(".raised > div")
          ?.textContent?.replace(/\,/g, "") || "0"
      );
      const newGoal = Math.ceil(supporters * this.increase);
      // If new goal is NaN, don't alter progress bar and bail here
      if (isNaN(newGoal)) {
        this.logger.log("Error: New goal is NaN, not altering progress bar");
        return;
      }
      // Reset fill width so that animation runs once new width is set
      fill.style.width = "0";
      const remainingElement = widget.querySelector(
        ".remaining > div:first-child span"
      ) as HTMLDivElement;
      if (remainingElement) {
        remainingElement.textContent = (newGoal - supporters).toLocaleString();
      }
      this.logger.log("New goal", newGoal);
      fill.style.width = `${(supporters / newGoal) * 100}%`;
    }
  }

  private shouldRun(): boolean {
    return ENGrid.getPageType() !== "DONATION" && !!this.widget;
  }
}
