import {
  EngridLogger,
  ENGrid,
} from "../../../engrid/packages/scripts"; // Uses ENGrid via Visual Studio Workspace
import { trackEvent } from "./tracking";
import { GdcpManager } from "./gdcp/gdcp-manager";

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

    // Defuse any iframes inside the modal before the user can see it.
    // The browser starts loading an iframe the moment it parses the
    // `src` attribute, which is long before this constructor runs — so
    // by the time we get here a GET to EN may already be in flight. We
    // rewrite `src` to "about:blank", which navigates the frame and
    // aborts the in-flight request. The original URL is stashed in
    // `data-deferred-src` and restored when the modal actually opens
    // (see `armModalIframes`). This preserves the "one EN thing at a
    // time" invariant of the Iframe Queue refactor — without this,
    // the bequest iframe would load concurrently with queued QCB
    // iframes even though the bequest *submit* is correctly gated on
    // `onChainComplete`.
    this.defuseModalIframes();

    this.addModal();

    if (this.shouldOpen()) {
      this.openWhenSafe();
    }

    this.logConditions();
  }

  /**
   * Open the bequest lightbox after GdcpManager has decided what to
   * do with any pending QCB iframe submissions. Opening synchronously
   * alongside in-flight QCB submits causes EN to drop QCB records
   * (the original bug tracked in EN-2802 / EN-2803), so this defers
   * until `GdcpManager.qcbChainDecided()` resolves.
   *
   * That promise resolves under all of:
   *   - the iframe queue chain finishes successfully,
   *   - the chain errors out (so we don't get stuck closed),
   *   - GdcpManager determines there's no chain to run (not a Thank
   *     You page, no supporter email available, no pending QCB
   *     sessions).
   *
   * A safety-net timeout opens the lightbox after 15s if the
   * promise never resolves (e.g., GdcpManager wasn't instantiated
   * for some reason).
   */
  private openWhenSafe(): void {
    const safetyNetMs = 15000;
    let opened = false;
    const openOnce = (reason: string) => {
      if (opened) return;
      opened = true;
      this.logger.log(`Opening bequest lightbox: ${reason}.`);
      this.armModalIframes();
      this.open();
    };

    GdcpManager.qcbChainDecided().then(() => {
      openOnce("QCB chain decided");
    });

    window.setTimeout(() => {
      openOnce(`safety-net timeout (${safetyNetMs}ms)`);
    }, safetyNetMs);
  }

  /**
   * Replace the `src` of every iframe inside `.modal--bequest` with
   * `about:blank` (aborting any in-flight load) and stash the original
   * URL on `data-deferred-src` so it can be restored when the modal
   * is about to be shown. Called in the constructor.
   */
  private defuseModalIframes(): void {
    const iframes = this.modalContent?.querySelectorAll<HTMLIFrameElement>(
      "iframe[src]"
    );
    if (!iframes || iframes.length === 0) return;
    iframes.forEach((iframe) => {
      const src = iframe.getAttribute("src");
      if (!src || src === "about:blank") return;
      iframe.dataset.deferredSrc = src;
      iframe.setAttribute("src", "about:blank");
      this.logger.log(`Defused iframe load: ${src}`);
    });
  }

  /**
   * Restore the original `src` on every iframe previously defused by
   * `defuseModalIframes`. Called immediately before each `open()` call
   * site in `openWhenSafe()`. After this runs the iframe begins
   * loading normally and the user can interact with it as they would
   * have before the queue refactor.
   *
   * We scope the query through the document (not `this.modalContent`)
   * because `addModal()` moves the modal element into a wrapper, so
   * the iframes now live under `.engrid-modal__body`.
   */
  private armModalIframes(): void {
    const iframes = document.querySelectorAll<HTMLIFrameElement>(
      ".engrid-modal__body iframe[data-deferred-src]"
    );
    if (iframes.length === 0) return;
    iframes.forEach((iframe) => {
      const src = iframe.dataset.deferredSrc;
      if (!src) return;
      iframe.setAttribute("src", src);
      delete iframe.dataset.deferredSrc;
      this.logger.log(`Armed iframe load: ${src}`);
    });
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
