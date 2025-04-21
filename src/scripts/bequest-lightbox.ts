import { EngridLogger, ENGrid } from "@4site/engrid-scripts";
import { trackEvent } from "./tracking";

export class BequestLightbox {
  private logger: EngridLogger = new EngridLogger(
    "BequestLightbox",
    "yellow",
    "black"
  );
  private readonly modalContent: Element | null = null;
  private readonly bequestUserProfile:
    | {
        crmConstituency?: string;
        doNotSendSolicitations?: string;
        includeInPlannedGivingSolicitations?: string;
        plannedGiftProspect?: string;
        totalNumberOfGifts?: string;
      }
    | undefined = undefined;
  private pageJson: any;

  constructor() {
    this.modalContent = document.querySelector(".modal--bequest");
    this.bequestUserProfile = window.bequestUserProfile || undefined;
    this.pageJson = (window as any).pageJson;

    if (!this.shouldRun()) {
      this.logger.log("Not running bequest modal.");
      return;
    }

    this.addModal();

    if (this.shouldOpen()) {
      this.open();
    }

    this.logConditions();
  }

  private shouldRun(): boolean {
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

    if (this.lessRestrictiveTrigger()) {
      this.logger.log("Opening bequest modal. Less restrictive trigger found.");
      return true;
    }

    if (this.strictTrigger()) {
      this.logger.log("Opening bequest modal. Strict trigger found.");
      return true;
    }

    this.logger.log("Not opening bequest modal. No conditions met.");
    return false;
  }

  private logConditions() {
    // prettier-ignore
    this.logger.log(`country: ${this.pageJson?.country}
      amount: ${this.pageJson?.amount}
      doNotSendSolicitations: ${this.bequestUserProfile?.doNotSendSolicitations}
      crmConstituency: ${this.bequestUserProfile?.crmConstituency}
      plannedGiftProspect: ${this.bequestUserProfile?.plannedGiftProspect}
      totalNumberOfGifts: ${this.bequestUserProfile?.totalNumberOfGifts}
      includeInPlannedGivingSolicitations: ${this.bequestUserProfile?.includeInPlannedGivingSolicitations}
      bequest_lb_select: ${this.getCookie("bequest_lb_select")}
      gp_form_submitted: ${this.getCookie("gp_form_submitted")}
      per_gp: ${this.getCookie("per_gp")}
      gp_email: ${this.getCookie("gp_email")}`);

    // prettier-ignore
    this.logger.log(`country: ${this.pageJson?.country} = ${this.pageJson?.country === "US"}
      doNotSendSolicitations: ${this.bequestUserProfile?.doNotSendSolicitations} === "Y" = ${this.bequestUserProfile?.doNotSendSolicitations === "Y"}
      crmConstituency: ${this.bequestUserProfile?.crmConstituency} includes "Legacy Club" = ${this.bequestUserProfile?.crmConstituency?.includes("Legacy Club")}
      amount: ${this.pageJson?.amount} >= 100 = ${this.pageJson?.amount >= 100}
      bequest_lb_select: ${this.getCookie("bequest_lb_select")} = ${this.getCookie("bequest_lb_select")}
      gp_form_submitted: ${this.getCookie("gp_form_submitted")} = ${this.getCookie("gp_form_submitted")}
      per_gp: ${this.getCookie("per_gp")} = ${this.getCookie("per_gp")}
      gp_email: ${this.getCookie("gp_email")} = ${this.getCookie("gp_email")}
      totalNumberOfGifts: ${this.bequestUserProfile?.totalNumberOfGifts} >= 3 = ${Number(this.bequestUserProfile?.totalNumberOfGifts) >= 3}
      includeInPlannedGivingSolicitations: ${this.bequestUserProfile?.includeInPlannedGivingSolicitations} === "Y" = ${this.bequestUserProfile?.includeInPlannedGivingSolicitations === "Y"}
      plannedGiftProspect: ${this.bequestUserProfile?.plannedGiftProspect} === "Y" = ${this.bequestUserProfile?.plannedGiftProspect === "Y"}`);
  }

  private lessRestrictiveTrigger() {
    if (
      this.modalContent?.classList.contains(
        "modal--bequest-less-restrictive"
      ) &&
      this.pageJson?.country === "US" &&
      this.bequestUserProfile?.doNotSendSolicitations !== "Y" &&
      !this.bequestUserProfile?.crmConstituency?.includes("Legacy Club") &&
      !this.getCookie("bequest_lb_select") &&
      !this.getCookie("gp_form_submitted")
    ) {
      this.logger.log("Less restrictive trigger passed condition");
      return true;
    }
    return false;
  }

  private strictTrigger(): boolean {
    if (
      this.pageJson?.country === "US" &&
      this.bequestUserProfile?.doNotSendSolicitations !== "Y" &&
      !this.bequestUserProfile?.crmConstituency?.includes("Legacy Club") &&
      this.pageJson?.amount >= 100 &&
      !this.getCookie("bequest_lb_select") &&
      !this.getCookie("gp_form_submitted")
    ) {
      this.logger.log("Strict trigger passed first condition");
      if (
        this.getCookie("per_gp") === "true" ||
        this.getCookie("gp_email") === "true" ||
        Number(this.bequestUserProfile?.totalNumberOfGifts) >= 3 ||
        this.bequestUserProfile?.includeInPlannedGivingSolicitations === "Y" ||
        this.bequestUserProfile?.plannedGiftProspect === "Y"
      ) {
        this.logger.log("Strict trigger passed second condition");
        return true;
      }
    }
    return false;
  }

  private addModal(): void {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="engrid-modal">
        <div class="engrid-modal__overlay">
          <div class="engrid-modal__container">
            <div class="engrid-modal__close">X</div>
            <div class="engrid-modal__body"></div>
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

      window.addEventListener("resize", () => {
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

  private getCookie(cookieName: string): string | null {
    const name = `${cookieName}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(";");

    for (let i = 0; i < cookieArray.length; i++) {
      let cookie = cookieArray[i];
      while (cookie.charAt(0) === " ") {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length, cookie.length);
      }
    }

    return null;
  }
}
