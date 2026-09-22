import { EngridLogger } from "@4site/engrid-scripts";

/**
 * Moves the inline Regive ask (designs 1 and 2) into the thank-you copy, where
 * the comps place it: immediately above the rule that precedes "Explore
 * Nature.org".
 *
 * The tag cannot be authored there — that copy is a single EN text block, so
 * putting it inside would mean editing the block on every page using Regive.
 *
 * It is the wrapper that moves, not the container. Regive replaces the <regive>
 * tag in place, so relocating the authored wrapper puts the banner in the right
 * position whenever Regive gets to it — no waiting on the container it builds
 * asynchronously.
 *
 * Design 3 is a fixed overlay and is scoped by .tnc-regive-lightbox instead, so
 * it is never matched here.
 */
export class RegiveInline {
  private logger: EngridLogger = new EngridLogger(
    "RegiveInline",
    "lightgray",
    "darkgreen",
    "🔁"
  );
  constructor() {
    const wrapper = document.querySelector<HTMLElement>(".tnc-regive-inline");
    if (!wrapper) return;
    this.moveIntoThankYouCopy(wrapper);
  }

  private moveIntoThankYouCopy(wrapper: HTMLElement): void {
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
}
