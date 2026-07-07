/*
  Use EN's built in showField and hideField functions to show/hide the bank account agreement field
  based on the value of the giveBySelect field.
  This is a workaround for having a conditionally visible field that is "required" by EN's validator.
 */

import { ENGrid } from "@4site/engrid-scripts";
import { EngridLogger } from "@4site/engrid-scripts";

export class BankAccountAgreementField {
  private logger: EngridLogger = new EngridLogger(
    "BankAccountAgreementField",
    "lightgray",
    "darkblue",
    "🏦"
  );
  private giveBySelectInputs: NodeListOf<HTMLInputElement> =
    document.querySelectorAll("[name='transaction.giveBySelect']");
  private bankAccountAgreementField: HTMLDivElement | null =
    document.querySelector(".en__field--879592");

  constructor() {
    if (!this.shouldRun()) return;

    const initialGiveBySelect = this.getGiveBySelectValue();
    if (initialGiveBySelect === "ACH") {
      this.showBankAccountAgreementField();
    } else {
      this.hideBankAccountAgreementField();
    }

    this.addEventListeners();
  }

  shouldRun(): boolean {
    return (
      this.bankAccountAgreementField !== null &&
      this.giveBySelectInputs.length > 0
    );
  }

  showBankAccountAgreementField(): void {
    // On a free event there is no payment, so the ACH bank account agreement must
    // never be shown/required. EventPages hides it and sets this flag; respect it
    // so a late give-by-select change/blur can't re-show and re-require the field.
    if (ENGrid.getBodyData("free-event") === "true") {
      this.logger.log(
        "Free event detected; leaving bank account agreement field hidden."
      );
      return;
    }
    if (
      ENGrid.checkNested(
        window.EngagingNetworks,
        "require",
        "_defined",
        "enjs",
        "hideField"
      ) &&
      this.bankAccountAgreementField?.classList.contains("en__hidden")
    ) {
      this.logger.log("showing bank account agreement field");
      window.EngagingNetworks.require._defined.enjs.showField("879592");
    }
  }

  hideBankAccountAgreementField(): void {
    if (
      ENGrid.checkNested(
        window.EngagingNetworks,
        "require",
        "_defined",
        "enjs",
        "hideField"
      ) &&
      !this.bankAccountAgreementField?.classList.contains("en__hidden")
    ) {
      this.logger.log("hiding bank account agreement field");
      window.EngagingNetworks.require._defined.enjs.hideField("879592");
    }
  }

  getGiveBySelectValue(): string {
    const giveBySelect = document.querySelector(
      "[name='transaction.giveBySelect']:checked"
    ) as HTMLInputElement;
    if(!giveBySelect) return "";
    return giveBySelect.value || "";
  }

  addEventListeners(): void {
    // Adjust the bank account agreement field based on the value of the giveBySelect field
    this.giveBySelectInputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (input.value === "ACH") {
          this.showBankAccountAgreementField();
        } else {
          this.hideBankAccountAgreementField();
        }
      });
    });

    // Re-check the bank account agreement field when the form inputs lose focus.
    // Because there may be a race condition where our script loads before EN's script
    // We have to periodically re-check this condition
    const formInputs = document.querySelectorAll("input, textarea, select");
    formInputs.forEach((el) => {
      el.addEventListener("blur", () => {
        if (this.getGiveBySelectValue() === "ACH") {
          this.showBankAccountAgreementField();
        } else {
          this.hideBankAccountAgreementField();
        }
      });
    });
  }
}
