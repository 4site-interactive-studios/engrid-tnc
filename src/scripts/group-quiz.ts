import { ENGrid, EngridLogger } from "@4site/engrid-scripts";

export class GroupQuiz {
  private logger: EngridLogger = new EngridLogger(
    "Quiz",
    "#FFFFFF",
    "#4d9068",
    "🛠️"
  );

  constructor() {
    if (!this.shouldRun()) return;
    this.logger.log("Initializing Group Quiz");

    // If we have the session key, add body data attribute for conditional styling
    const quizGroup = sessionStorage.getItem("quiz-group");
    if (quizGroup) {
      ENGrid.setBodyData("quiz-group", quizGroup);
    }

    // Add conditional class from image to its parent element, and set banner image
    const quizImages = document.querySelectorAll(
      "figure.media-with-attribution img[class*='showif-group']"
    ) as NodeListOf<HTMLImageElement>;
    [...quizImages].forEach((img) => {
      let parent = img.closest(".en__component--imageblock");
      parent = parent ?? img.closest("figure.media-with-attribution");

      const showifGroupClass = [...img.classList].find((cssClass) =>
        cssClass.includes("showif-group")
      );

      if (parent && showifGroupClass) {
        parent.classList.add(showifGroupClass);
      }

      const bodyBanner = document.querySelector(".body-banner") as HTMLElement;
      if (
        bodyBanner &&
        showifGroupClass ===
          "showif-group" + sessionStorage.getItem("quiz-group")
      ) {
        bodyBanner.style.setProperty("--banner-image-src", `url(${img?.src})`);
      }
    });

    // On page with the main question, set the session key for the group
    const questionInputs = document.querySelectorAll(
      ".group-question input[name*='transaction.svblock']"
    );
    [...questionInputs].forEach((input) => {
      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const index = [...questionInputs].indexOf(target) + 1;
        sessionStorage.setItem("quiz-group", index.toString());
      });
    });
  }

  private shouldRun() {
    return (
      ENGrid.getBodyData("subpagetype") === "quiz" &&
      document.querySelector(".en__component--advrow.group-quiz")
    );
  }
}
