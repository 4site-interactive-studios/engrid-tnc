import { EngridLogger } from "@4site/engrid-scripts";

/**
 * Dismissal for the Regive lightbox (design 3).
 *
 * Regive builds its banner inside a same-origin iframe, and a <script> inside a
 * <template> never executes — so the close controls cannot bind themselves and
 * the parent page has to reach into the iframe once the banner exists.
 *
 * Runs only on pages whose <regive> tag is wrapped in .tnc-regive-lightbox,
 * which is also what scopes the overlay styling.
 */
export class RegiveLightbox {
  private logger: EngridLogger = new EngridLogger(
    "RegiveLightbox",
    "lightgray",
    "darkgreen",
    "🔁"
  );
  private readonly lightbox: HTMLElement | null;
  private bound = false;

  constructor() {
    this.lightbox = document.querySelector<HTMLElement>(".tnc-regive-lightbox");
    if (!this.shouldRun()) return;
    this.listen();
  }

  private shouldRun(): boolean {
    return this.lightbox !== null;
  }

  private listen(): void {
    // Regive replaces the <regive> tag with its iframe after page load, so the
    // banner is usually not in the DOM yet; "loaded" is the child's signal that
    // it has finished rendering. Try once up front in case Regive got there
    // first — bindControls is idempotent.
    window.addEventListener("message", (event: MessageEvent) => {
      if (!this.isRegiveLoaded(event.data)) return;
      this.bindControls();
    });
    this.bindControls();

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") this.dismiss();
    });
  }

  /** postMessage payloads are untrusted, so narrow before reading them. */
  private isRegiveLoaded(data: unknown): boolean {
    if (typeof data !== "object" || data === null) return false;
    const message = data as { sender?: unknown; action?: unknown };
    return message.sender === "regive" && message.action === "loaded";
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

  /**
   * Hidden rather than removed: removing the container tears down the iframe,
   * which would cut off Regive's own success and celebrate handling if a
   * submission were still settling.
   */
  private dismiss(): void {
    if (this.lightbox) this.lightbox.style.display = "none";
  }
}
