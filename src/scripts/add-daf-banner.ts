// This script adds a DAF banner to the donation form, only if the donnor is loading the page from a DAF form
import { EngridLogger } from "@4site/engrid-scripts";

export class AddDAFBanner {
  private logger: EngridLogger = new EngridLogger(
    "AddDAFBanner",
    "lightgray",
    "darkblue",
    "🪙"
  );
  constructor() {
    if (!this.shouldRun()) return;
    this.AddDAFBanner();
  }

  shouldRun() {
    // Check if the URL contains the "fromDAF" query parameter
    return window.location.search.includes("fromDAF");
  }
  private AddDAFBanner() {
    this.logger.log("Adding DAF Banner");
    const giveBySelectWrapper = document.querySelector(
      ".en__field--giveBySelect .en__field__element--radio"
    ) as HTMLDivElement;
    if (!giveBySelectWrapper) {
      this.logger.log("No giveBySelectWrapper found");
      return;
    }
    const dafBannerContainer = `
    <!-- DAF Banner (added dynamically) -->
      <div class="en__component en__component--copyblock daf-banner">
	      <p><a href="javascript:void(0)" onclick="history.back()">Click here</a> to make your donation using <strong>Donor Advised Funds (DAF)</strong></p>
      </div>
    `;
    // Add the DAF banner to the top of the page, on .body-main
    const bodyMain = document.querySelector(".body-main") as HTMLElement;
    if (!bodyMain) {
      this.logger.log("No bodyMain found");
      return;
    }
    bodyMain.insertAdjacentHTML("afterbegin", dafBannerContainer);
    this.logger.log("Banner added");
  }
}
