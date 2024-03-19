import { ENGrid, EngridLogger } from "@4site/engrid-common";

export class Ecard {
  private logger: EngridLogger = new EngridLogger(
    "TNC Ecard",
    "yellow",
    "black",
    "📧"
  );

  constructor() {
    if (!this.pageIsEmbeddedEcard()) return;
    this.logger.log("Running Ecard component");
  }

  private pageIsEmbeddedEcard(): boolean {
    return ENGrid.getPageType() === "ECARD" && ENGrid.hasBodyData("embedded");
  }
}
