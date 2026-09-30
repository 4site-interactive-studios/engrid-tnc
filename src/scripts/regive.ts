import { ENGrid, EngridLogger } from "@4site/engrid-scripts";
import { BequestLightbox } from "./bequest-lightbox";
import { GdcpManager } from "./gdcp/gdcp-manager";

/**
 * Activation: the Regive script tag is deliberately absent from the Thank
 * You page in EN — it is injected here, once `GdcpManager.qcbChainDecided()`
 * and then `BequestLightbox.settled()` resolve. Regive creates its iframe
 * the moment it initializes, and EN drops records when iframes in different
 * frames submit simultaneously, so it must not load while QCB iframes are
 * in flight or the bequest modal is open.
 */
export class Regive {
  private logger: EngridLogger = new EngridLogger(
    "Regive",
    "lightgray",
    "darkgreen",
    "🔁"
  );

  private static readonly scriptUrl =
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/regive.js";

  private static readonly thanksDuration = 6000;

  private readonly lightbox: HTMLElement | null = null;
  private bound = false;

  constructor() {
    this.lightbox = document.querySelector<HTMLElement>(".tnc-regive-lightbox");
    this.moveInlineAsk();
    this.listenForLightbox();
    this.activateWhenSafe();
  }

  private activateWhenSafe(): void {
    // The Thank You page inside the Regive iframe (reached after a Regive
    // submission) needs the bundle immediately to report the result to its
    // parent; the queue and bequest lightbox are top-level concerns.
    if (this.isEmbedded()) {
      this.activate("embedded page");
      return;
    }

    GdcpManager.qcbChainDecided()
      .then(() => BequestLightbox.settled())
      .then(() => this.activate("iframe queue and bequest lightbox settled"));
  }

  private activate(reason: string): void {
    if (!document.querySelector("regive")) return;
    // A surviving template script tag means Regive already self-initialized
    // ungated; injecting again would double-init it.
    if (document.querySelector("script[src*='regive']")) {
      this.logger.log(
        "Regive script is already on the page. It should be removed from " +
          "the Thank You page in EN — the theme controls activation."
      );
      return;
    }
    this.logger.log(`Activating Regive: ${reason}.`);
    const script = document.createElement("script");
    // Regive detects debug mode from its own script src.
    const debug = ENGrid.getUrlParameter("debug") == "true" ? "?debug" : "";
    script.src = Regive.scriptUrl + debug;
    document.body.appendChild(script);
  }

  private isEmbedded(): boolean {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  private moveInlineAsk(): void {
    const wrapper = document.querySelector<HTMLElement>(".tnc-regive-inline");
    if (!wrapper) return;

    const copyBlock = document.querySelector(
      ".en__component--copyblock.recurring-frequency-annual-hide"
    );
    if (!copyBlock) {
      this.logger.log("No recurring-frequency-annual-hide copy block found");
      return;
    }

    const rule = copyBlock.querySelector("hr");
    if (!rule) {
      this.logger.log("Copy block has no rule to insert above");
      return;
    }

    // The code block the tag came from is left in place: EN gives code blocks
    // no margin or padding, so an emptied one renders at zero height.
    rule.insertAdjacentElement("beforebegin", wrapper);
    this.logger.log("Moved the Regive ask above the rule in the thank-you copy");
  }

  private listenForLightbox(): void {
    if (!this.lightbox) return;

    // The banner's close controls live inside a same-origin iframe built from
    // a <template>, so scripts inside it never execute — the parent has to
    // bind them once the child announces "loaded". The up-front bindControls
    // call covers the race where Regive rendered before this listener.
    window.addEventListener("message", (event: MessageEvent) => {
      switch (this.regiveAction(event.data)) {
        case "loaded":
          this.bindControls();
          break;
        case "success":
          this.dismissAfterThanks();
          break;
      }
    });
    this.bindControls();

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") this.dismiss();
    });
  }

  private regiveAction(data: unknown): string | null {
    if (typeof data !== "object" || data === null) return null;
    const message = data as { sender?: unknown; action?: unknown };
    if (message.sender !== "regive") return null;
    return typeof message.action === "string" ? message.action : null;
  }

  // Regive ignores its own `exit` action once the banner is marked
  // successful, so without this the thank-you panel would block the page
  // forever.
  private dismissAfterThanks(): void {
    this.logger.log("Gift accepted — closing the lightbox shortly");
    window.setTimeout(() => this.dismiss(), Regive.thanksDuration);
  }

  private bindControls(): void {
    if (this.bound) return;
    const frame = this.lightbox?.querySelector("iframe");
    const doc = frame?.contentDocument;
    if (!doc) return;

    const controls = doc.querySelectorAll<HTMLElement>(
      ".tnc-regive-3__close, .tnc-regive-3__decline"
    );
    if (controls.length === 0) {
      this.logger.log("Banner has no close controls to bind");
      return;
    }

    controls.forEach((control) => {
      control.addEventListener("click", () => this.dismiss());
    });
    this.bound = true;
    this.logger.log("Bound the lightbox close controls");
  }

  private dismiss(): void {
    // Hidden rather than removed: removing the container would tear down the
    // iframe mid-submission and cut off Regive's success/celebrate handling.
    if (this.lightbox) this.lightbox.style.display = "none";
  }
}
