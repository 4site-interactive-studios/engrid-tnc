import { ENGrid, Modal } from "@4site/engrid-scripts";

export class QuizLeadGenModal extends Modal {
  constructor() {
    super({
      onClickOutside: "bounce",
      addCloseButton: false,
      closeButtonLabel: "",
    });

    // Move the modal inside the main EN form element
    const modal = document
      .querySelector(".engrid-modal .modal--lead-gen")
      ?.closest(".engrid-modal") as HTMLElement;
    document.querySelector("#engrid > form")?.appendChild(modal);

    this.openModal();
  }

  getModalContent() {
    return document.querySelector(".modal--lead-gen") as HTMLElement;
  }

  private openModal() {
    ENGrid.setBodyData("bequest-lightbox", "open");
    this.open();
  }
}
