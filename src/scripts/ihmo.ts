import { DonationFrequency, ENGrid } from "@4site/engrid-scripts";

type GiftType = "HONORARY" | "MEMORIAL";
type GiftNotification = "ECARD" | "MAIL" | "NONE";
type FormLayouts = {
  [Key in GiftType]: {
    [Key in GiftNotification]: {
      topFields: string[];
      bottomFields: string[];
    };
  };
};

export class IHMO {
  private giftType: GiftType = "HONORARY";
  private giftNotification: GiftNotification = "ECARD";
  private formLayouts: FormLayouts = {
    HONORARY: {
      ECARD: {
        topFields: [".en__field--honname", ".en__field--othamt2"],
        bottomFields: [".en__field--infemail"],
      },
      MAIL: {
        topFields: [".en__field--honname", ".en__field--othamt2"],
        bottomFields: [
          ".en__field--NOT_TAGGED_38",
          ".en__field--NOT_TAGGED_33",
          ".en__field--NOT_TAGGED_34",
          ".en__field--NOT_TAGGED_36",
          ".en__field--NOT_TAGGED_35",
          ".en__field--NOT_TAGGED_37",
        ],
      },
      NONE: {
        topFields: [".en__field--honname", ".en__field--othamt2"],
        bottomFields: [],
      },
    },
    MEMORIAL: {
      ECARD: {
        topFields: [
          ".en__field--honname",
          ".en__field--othamt2",
          ".en__field--NOT_TAGGED_36",
          ".en__field--NOT_TAGGED_35",
        ],
        bottomFields: [
          ".en__field--infname",
          ".en__field--othamt3",
          ".en__field--infemail",
        ],
      },
      MAIL: {
        topFields: [
          ".en__field--honname",
          ".en__field--othamt2",
          ".en__field--NOT_TAGGED_36",
          ".en__field--NOT_TAGGED_35",
        ],
        bottomFields: [
          ".en__field--infname",
          ".en__field--othamt3",
          ".en__field--infcountry",
          ".en__field--infadd1",
          ".en__field--infadd2",
          ".en__field--infcity",
          ".en__field--infreg",
          ".en__field--infpostcd",
        ],
      },
      NONE: {
        topFields: [
          ".en__field--honname",
          ".en__field--othamt2",
          ".en__field--NOT_TAGGED_36",
          ".en__field--NOT_TAGGED_35",
        ],
        bottomFields: [],
      },
    },
  };
  private ihmoCheckbox: HTMLInputElement | null = document.querySelector(
    '[name="transaction.inmem"][type="checkbox"]'
  );
  private topForm: HTMLElement | null =
    document.querySelector(".ihmo-top-form");
  private bottomForm: HTMLElement | null =
    document.querySelector(".ihmo-bottom-form");
  private _donationFrequency = DonationFrequency.getInstance();
  private sourceCodeField: HTMLSelectElement | HTMLInputElement | null =
    document.querySelector('[name="supporter.appealCode"]');

  constructor() {
    // If we're on the thank you page, add the gift details as data attributes and return
    if (this.onThankYouPage()) {
      this.setGiftDetailsAsDataAttributes();
      return;
    }
    // Stop here if we're not on an IHMO page
    if (!this.shouldRun()) return;
    this.createPageLayout();
    this.configureForm(this.giftType, this.giftNotification);
    this.addEventListeners();
    this.hideAllFields();
    this.setDefaultSourceCodes();
    // If IHMO is checked, save the gift details and set the source code
    if (this.ihmoCheckbox?.checked) {
      this.saveGiftDetails();
      this.setSourceCode(this.giftType);
    }
  }

  private shouldRun(): boolean {
    return !!this.ihmoCheckbox;
  }

  private onThankYouPage(): boolean {
    return (
      sessionStorage.getItem("engrid_ihmo-gift-details") !== null &&
      ENGrid.getPageNumber() === 2
    );
  }

  private createPageLayout() {
    const ihmoWrapper = document.createElement("div");
    ihmoWrapper.classList.add("engrid--ihmo-wrapper", "ihmo-closed");

    // Add all elements with the class "ihmo-content" to the IHMO content wrapper
    const ihmoContent = document.querySelectorAll(".ihmo-content");
    ihmoContent.forEach((content) => {
      ihmoWrapper.appendChild(content);
    });

    // Insert the IHMO content wrapper after the IHMO checkbox
    this.ihmoCheckbox
      ?.closest(".en__component--formblock")
      ?.insertAdjacentElement("afterend", ihmoWrapper);

    // If the page includes the embedded ecard component, move it to the IHMO content wrapper
    const embeddedEcard = document.querySelector(".engrid--embedded-ecard");
    if (embeddedEcard) {
      embeddedEcard.classList.add("ihmo-content");
      const ecardAnchor = document
        .querySelector(".en__field--select-notification-option")
        ?.closest(".en__component--formblock");
      if (ecardAnchor) {
        ecardAnchor.insertAdjacentElement("afterend", embeddedEcard);
      }
      const ecardIframe = embeddedEcard.querySelector("iframe");
      if (ecardIframe) {
        // Extra URL param on eCard does additional functionality for IHMO page.
        ecardIframe.setAttribute(
          "src",
          ecardIframe.src + "&data-engrid-embedded-ihmo=true"
        );
      }
    }

    ENGrid.setBodyData("ihmo", "true");
  }

  private addEventListeners() {
    // When "This gift is in honor or memory of someone" checkbox is changed
    this.ihmoCheckbox?.addEventListener("change", (e) => {
      const checkbox = e.target as HTMLInputElement;
      if (checkbox.checked) {
        document
          .querySelector(".engrid--ihmo-wrapper")
          ?.classList.remove("ihmo-closed");
        this.configureForm(this.giftType, this.giftNotification);
        this.saveGiftDetails();
        this.setSourceCode(this.giftType);
      } else {
        document
          .querySelector(".engrid--ihmo-wrapper")
          ?.classList.add("ihmo-closed");
        this.displayEcard(false);
        this.hideAllFields();
        this.clearGiftDetails();
        this.setSourceCode(false);
      }
    });

    // When the "Gift Type" radio button is changed
    document.getElementsByName("transaction.trbopts").forEach((el) => {
      el.addEventListener("change", (e) => {
        const radio = e.target as HTMLInputElement;
        const giftType: GiftType =
          radio.value === "In Honor" ? "HONORARY" : "MEMORIAL";
        this.configureForm(giftType, this.giftNotification);
        this.saveGiftDetails();
        this.setSourceCode(giftType);
      });
    });

    // When the "Select Notification option" radio button is changed
    document.getElementsByName("supporter.questions.1381061").forEach((el) => {
      el.addEventListener("change", (e) => {
        const radio = e.target as HTMLInputElement;
        let giftNotification: GiftNotification;
        if (radio.value === "Send an ecard") {
          giftNotification = "ECARD";
        } else if (radio.value === "Notify by mail") {
          giftNotification = "MAIL";
        } else {
          giftNotification = "NONE";
        }
        this.configureForm(this.giftType, giftNotification);
        this.saveGiftDetails();
      });
    });

    const firstNameField = document.getElementById(
      "en__field_transaction_infname"
    ) as HTMLInputElement;
    const lastNameField = document.getElementById(
      "en__field_transaction_othamt3"
    ) as HTMLInputElement;
    const emailField = document.getElementById(
      "en__field_transaction_infemail"
    ) as HTMLInputElement;
    const honorFirstNameField = document.getElementById(
      "en__field_transaction_honname"
    ) as HTMLInputElement;
    const honorLastNameField = document.getElementById(
      "en__field_transaction_othamt2"
    ) as HTMLInputElement;
    const ecardIframe = document.querySelector(
      ".engrid-iframe--embedded-ecard"
    ) as HTMLIFrameElement;

    // Setting the recipient name and email in the ecard iframe
    [
      firstNameField,
      lastNameField,
      emailField,
      honorFirstNameField,
      honorLastNameField,
    ].forEach((field) => {
      field.addEventListener("input", () => {
        const fullName =
          this.giftType === "HONORARY"
            ? `${honorFirstNameField.value} ${honorLastNameField.value}`
            : `${firstNameField.value} ${lastNameField.value}`;

        ecardIframe.contentWindow?.postMessage(
          {
            action: "set_recipient",
            name: fullName,
            email: emailField.value,
          },
          location.origin
        );
      });
    });

    //Hiding the IHMO section when monthly donation is selected
    // Listen for changes to the donation frequency and amount
    this._donationFrequency.onFrequencyChange.subscribe((frequency) => {
      if (frequency !== "onetime") {
        // Hide the IHMO section, hide the fields to prevent validation errors
        // Disable ecard to prevent it being sent
        document.querySelectorAll(".ihmo-element").forEach((el) => {
          el.classList.add("hide");
        });
        document
          .querySelector(".engrid--ihmo-wrapper")
          ?.classList.add("ihmo-closed");
        this.displayEcard(false);
        this.hideAllFields();
        this.hideField(".en__field--inmem");
      } else {
        // Make IHMO elements visible
        document.querySelectorAll(".ihmo-element").forEach((el) => {
          el.classList.remove("hide");
        });
        this.showField(".en__field--inmem");
        if (this.ihmoCheckbox?.checked) {
          // Don't call "configureForm" unless the IHMO checkbox is checked, otherwise we might get validation errors
          this.configureForm(this.giftType, this.giftNotification);
          document
            .querySelector(".engrid--ihmo-wrapper")
            ?.classList.remove("ihmo-closed");
        }
      }
    });

    // When gift designation changes, update the source code
    if (this.sourceCodeField?.tagName === "SELECT") {
      this.sourceCodeField?.addEventListener("change", () => {
        const sourceCodeType = this.ihmoCheckbox?.checked
          ? this.giftType
          : false;
        this.setSourceCode(sourceCodeType);
      });
    }
  }

  private configureForm(
    giftType: GiftType,
    notificationType: GiftNotification
  ) {
    this.giftType = giftType;
    this.giftNotification = notificationType;

    this.setFormLayout();
    this.setFormHeadings();
    this.setFieldLabels();
    this.displayEcard(
      this.giftNotification === "ECARD" && this.ihmoCheckbox?.checked
    );
  }

  private saveGiftDetails() {
    const giftDetails = {
      giftType: this.giftType,
      giftNotification: this.giftNotification,
    };
    sessionStorage.setItem(
      "engrid_ihmo-gift-details",
      JSON.stringify(giftDetails)
    );
    this.setGiftDetailsAsDataAttributes();
  }

  private clearGiftDetails() {
    sessionStorage.removeItem("engrid_ihmo-gift-details");
    this.setGiftDetailsAsDataAttributes();
  }

  private setGiftDetailsAsDataAttributes() {
    const giftDetails = sessionStorage.getItem("engrid_ihmo-gift-details");
    if (!giftDetails) {
      ENGrid.setBodyData("ihmo-gift-type", false);
      ENGrid.setBodyData("ihmo-gift-notification", false);
      return;
    }
    const { giftType, giftNotification } = JSON.parse(giftDetails);
    ENGrid.setBodyData("ihmo-gift-type", giftType);
    ENGrid.setBodyData("ihmo-gift-notification", giftNotification);
  }

  private setSourceCode(giftType: GiftType | boolean) {
    if (!this.sourceCodeField) return;

    const sourceCodeContainer =
      this.sourceCodeField instanceof HTMLSelectElement
        ? this.sourceCodeField.options[this.sourceCodeField.selectedIndex]
        : this.sourceCodeField;

    if (
      sourceCodeContainer.value === "AHOMAONLN21W0XXX01" &&
      this.sourceCodeField instanceof HTMLSelectElement
    ) {
      // if "use my gift where it's needed most" option is selected, do not change the source code"
      return;
    }

    const sourceEnd = sourceCodeContainer.value.substring(
      sourceCodeContainer.value.length - 6
    );

    if (giftType === "HONORARY") {
      sourceCodeContainer.value = sourceCodeContainer.value.replace(
        sourceEnd,
        "TRIHXX"
      );
    } else if (giftType === "MEMORIAL") {
      sourceCodeContainer.value = sourceCodeContainer.value.replace(
        sourceEnd,
        "TRIMXX"
      );
    } else {
      sourceCodeContainer.value =
        sourceCodeContainer.getAttribute("data-default-source-code") || "";
    }

    ENGrid.setBodyData("source-code", this.sourceCodeField.value);
  }

  private setFormLayout() {
    const formLayout = this.formLayouts[this.giftType][this.giftNotification];
    // Add fields to the top form section
    formLayout.topFields.forEach((field) => {
      const el = document.querySelector(field);
      if (el) {
        this.topForm?.appendChild(el);
        this.showField(el);
      }
    });

    // Add fields to the bottom form section
    formLayout.bottomFields.forEach((field) => {
      const el = document.querySelector(field);
      if (el) {
        this.bottomForm?.appendChild(el);
        this.showField(el);
      }
    });

    // Hide unused fields in the top form section
    const topFormFields = this.topForm?.children || [];
    [...topFormFields].forEach((el) => {
      const classList = Array.from(el.classList);
      const isActiveField = formLayout.topFields.some((field) =>
        classList.includes(field.slice(1))
      );
      if (!isActiveField) {
        this.hideField(el);
      }
    });

    // Hide unused fields in the bottom form section
    const bottomFormFields = this.bottomForm?.children || [];
    [...bottomFormFields].forEach((el) => {
      const classList = Array.from(el.classList);
      const isActiveField = formLayout.bottomFields.some((field) =>
        classList.includes(field.slice(1))
      );
      if (!isActiveField) {
        this.hideField(el);
      }
    });
  }

  private setFormHeadings() {
    const headings = document.querySelectorAll(".form-heading.ihmo-content h3");
    if (headings.length === 0) return;
    const firstHeading = headings[0];
    const lastHeading = headings[headings.length - 1];

    if (!firstHeading || !lastHeading) return;

    if (this.giftType === "HONORARY") {
      firstHeading.textContent = "PERSON TO BE HONORED";
      lastHeading.textContent = "HONOREE'S PERSONAL INFORMATION";
      if (
        this.giftNotification === "ECARD" ||
        this.giftNotification === "NONE"
      ) {
        lastHeading.closest(".form-heading")?.classList.add("hide");
      } else {
        lastHeading.closest(".form-heading")?.classList.remove("hide");
      }
    } else {
      firstHeading.textContent = "PERSON TO BE REMEMBERED";
      lastHeading.textContent = "PERSON TO BE NOTIFIED";
      if (this.giftNotification === "NONE") {
        lastHeading.closest(".form-heading")?.classList.add("hide");
      } else {
        lastHeading.closest(".form-heading")?.classList.remove("hide");
      }
    }
  }

  private setFieldLabels() {
    const firstNameFieldLabel = document.querySelector(
      ".en__field--honname > label"
    );
    const lastNameFieldLabel = document.querySelector(
      ".en__field--othamt2 > label"
    );
    const cityFieldLabel = document.querySelector(
      ".en__field--NOT_TAGGED_36 > label"
    );
    const stateFieldLabel = document.querySelector(
      ".en__field--NOT_TAGGED_35 > label"
    );

    if (
      !firstNameFieldLabel ||
      !lastNameFieldLabel ||
      !cityFieldLabel ||
      !stateFieldLabel
    ) {
      return;
    }

    if (this.giftType === "HONORARY") {
      firstNameFieldLabel.textContent = "Honoree First Name";
      lastNameFieldLabel.textContent = "Honoree Last Name";
      cityFieldLabel.textContent = "Honoree City";
      stateFieldLabel.textContent = "Honoree State";
    } else {
      firstNameFieldLabel.textContent = "Deceased Person's First Name";
      lastNameFieldLabel.textContent = "Deceased Person's Last Name";
      cityFieldLabel.textContent = "Deceased Person's City";
      stateFieldLabel.textContent = "Deceased Person's State";
    }
  }

  private displayEcard(show: boolean = true) {
    const eCardCheckbox = document.getElementById(
      "en__field_embedded-ecard"
    ) as HTMLInputElement;
    eCardCheckbox.checked = show;
    eCardCheckbox.dispatchEvent(new Event("change"));
  }

  private hideAllFields() {
    [
      ".en__field--honname",
      ".en__field--othamt2",
      ".en__field--NOT_TAGGED_36",
      ".en__field--NOT_TAGGED_35",
      ".en__field--infname",
      ".en__field--othamt3",
      ".en__field--infcountry",
      ".en__field--infadd1",
      ".en__field--infadd2",
      ".en__field--infcity",
      ".en__field--infreg",
      ".en__field--infpostcd",
      ".en__field--infemail",
      ".en__field--NOT_TAGGED_38",
      ".en__field--NOT_TAGGED_33",
      ".en__field--NOT_TAGGED_34",
      ".en__field--NOT_TAGGED_37",
    ].forEach((field) => {
      this.hideField(field);
    });
  }

  private hideField(field: string | Element) {
    const el = field instanceof Element ? field : document.querySelector(field);
    if (el) {
      const identifier = [...el.classList]
        .find((c) => c.match(/en__field--\d+/))
        ?.replace("en__field--", "");
      if (identifier) {
        window.EngagingNetworks.require._defined.enjs.hideField(identifier);
      }
    }
  }

  private showField(field: string | Element) {
    const el = field instanceof Element ? field : document.querySelector(field);
    if (el) {
      const identifier = [...el.classList]
        .find((c) => c.match(/en__field--\d+/))
        ?.replace("en__field--", "");
      if (identifier) {
        window.EngagingNetworks.require._defined.enjs.showField(identifier);
      }
    }
  }

  /*
   * Set the default source codes as a data attribute
   */
  private setDefaultSourceCodes() {
    if (!this.sourceCodeField) return;

    if (this.sourceCodeField instanceof HTMLInputElement) {
      // If the source code field is an input, set the default source code as a data attribute
      this.sourceCodeField.setAttribute(
        "data-default-source-code",
        this.sourceCodeField.value
      );
      return;
    }

    // If the source code field is a select, set the default source code as a data attribute on each option
    this.sourceCodeField.querySelectorAll("option").forEach((option) => {
      if (option && option.value) {
        option.setAttribute("data-default-source-code", option.value);
      }
    });
  }
}
