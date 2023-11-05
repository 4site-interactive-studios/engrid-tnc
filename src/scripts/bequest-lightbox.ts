import { EngridLogger, ENGrid } from "@4site/engrid-common";
import { trackEvent } from "./tracking";

export class BequestLightbox {
  private logger: EngridLogger = new EngridLogger(
    "BequestLightbox",
    "yellow",
    "black"
  );
  private modalContent: Element | null = null;
  private bequestUserProfile: Object | undefined = undefined;

  constructor() {
    if (!this.shouldRun()) return;

    this.addModal();

    if (this.shouldOpen()) {
      this.open();
      return;
    }
  }

  private shouldRun(): boolean {
    this.modalContent = document.querySelector(".modal--bequest");
    // @ts-ignore
    this.bequestUserProfile = window.bequestUserProfile || undefined;
    if (this.modalContent && !this.bequestUserProfile) {
      this.logger.log(
        "Bequest modal found, but no user profile found. Please add the User Profile Script."
      );
    }
    return !!this.modalContent && !!this.bequestUserProfile;
  }

  private shouldOpen(): boolean {
    if (this.modalContent?.classList.contains("modal--always-open")) {
      this.logger.log("Opening bequest modal. Always open trigger found.");
      return true;
    }
    this.logger.log("Not opening bequest modal. No conditions met.");
    return false;
  }

  private addModal(): void {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="engrid-modal">
          <div class="engrid-modal__overlay">
            <div class="engrid-modal__container">
              <div class="engrid-modal__close">X</div>
              <div class="engrid-modal__body">
              </div>
            </div>
          </div>
        </div>`
    );

    document
      .querySelector(".engrid-modal .engrid-modal__body")
      ?.appendChild(this.modalContent as Node);

    this.addEventListeners();
  }

  private open(): void {
    ENGrid.setBodyData("modal", "open");
    ENGrid.setBodyData("bequest-lightbox", "open");
    trackEvent("lightbox_impression", {
      lightbox_name: "bequest",
    });
  }

  private addEventListeners(): void {
    // Close event on top X
    document
      .querySelector(".engrid-modal__close")
      ?.addEventListener("click", () => {
        this.close();
      });

    // Bounce scale when clicking outside of modal
    document
      .querySelector(".engrid-modal__overlay")
      ?.addEventListener("click", (event) => {
        if (event.target === event.currentTarget) {
          const modal = document.querySelector(".engrid-modal");
          if (modal) {
            modal.classList.remove("engrid-modal--scale");
            void modal.clientWidth;
            modal.classList.add("engrid-modal--scale");
          }
        }
      });

    // Close on "modal__close" click
    const closeEls = document.querySelectorAll(".modal__close");
    closeEls.forEach((el) => {
      el.addEventListener("click", () => {
        this.close();
      });
    });

    // Resize iframe on load
    const iframe = document.querySelector(
      ".engrid-modal__body iframe"
    ) as HTMLIFrameElement;
    if (iframe) {
      this.resizeIframe(iframe);

      iframe.addEventListener("load", () => {
        this.resizeIframe(iframe);
      });
    }

    // Listen for iframe submission message from iframe page 2, and close modal.
    window.addEventListener("message", (event) => {
      if (event.data === "iframeSubmitted") {
        this.close();
        trackEvent("lightbox_click", {
          lightbox_name: "bequest",
        });
      }
    });
  }

  private close(): void {
    ENGrid.setBodyData("modal", "closed");
    ENGrid.setBodyData("bequest-lightbox", "closed");
  }

  private resizeIframe(iframe: HTMLIFrameElement): void {
    iframe.style.height =
      iframe.contentWindow?.document.body.scrollHeight + "px";
  }
}
