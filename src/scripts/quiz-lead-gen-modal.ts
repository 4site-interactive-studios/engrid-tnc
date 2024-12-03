import { ENGrid, Modal } from "@4site/engrid-scripts";

export class QuizLeadGenModal extends Modal {
  constructor() {
    super({
      onClickOutside: "bounce",
      addCloseButton: false,
      closeButtonLabel: "",
    });

    // const modalBody = document.querySelector(".engrid-modal__body");
    // modalBody?.querySelector(".btn")?.addEventListener("click", (e) => {
    //   console.log("clicked");
    //   return false;
    // });

    console.log(this.modalContent);

    this.openModal();
  }

  getModalContent() {
    //return document.querySelector(".modal--lead-gen")?.innerHTML as string;
    return document.querySelector(".modal--lead-gen") as HTMLElement;
  }

  private openModal() {
    ENGrid.setBodyData("bequest-lightbox", "open");
    this.open();
  }
}
