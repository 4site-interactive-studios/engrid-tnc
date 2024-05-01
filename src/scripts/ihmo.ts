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
    '[name="transaction.inmem"]'
  );
  private topForm: HTMLElement | null =
    document.querySelector(".ihmo-top-form");
  private bottomForm: HTMLElement | null =
    document.querySelector(".ihmo-bottom-form");

  constructor() {
    if (!this.shouldRun()) return;
    this.createPageLayout();
    this.configureForm(this.giftType, this.giftNotification);
    this.addEventListeners();
    this.hideAllFields();
  }

  private shouldRun(): boolean {
    return !!this.ihmoCheckbox;
  }

  private createPageLayout() {
    const ihmoWrapper = document.createElement("div");
    ihmoWrapper.classList.add("engrid--ihmo-wrapper", "hide");

    const ihmoContent = document.querySelectorAll(".ihmo-content");
    ihmoContent.forEach((content) => {
      ihmoWrapper.appendChild(content);
    });

    this.ihmoCheckbox
      ?.closest(".en__component--formblock")
      ?.insertAdjacentElement("afterend", ihmoWrapper);

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
        ecardIframe.setAttribute(
          "src",
          ecardIframe.src + "&data-engrid-embedded-ihmo=true"
        );
      }
    }
  }

  private addEventListeners() {
    // When "This gift is in honor or memory of someone" checkbox is changed
    this.ihmoCheckbox?.addEventListener("change", (e) => {
      const checkbox = e.target as HTMLInputElement;
      if (checkbox.checked) {
        document
          .querySelector(".engrid--ihmo-wrapper")
          ?.classList.remove("hide");
        this.configureForm(this.giftType, this.giftNotification);
      } else {
        document.querySelector(".engrid--ihmo-wrapper")?.classList.add("hide");
        this.displayEcard(false);
        this.hideAllFields();
      }
    });

    // When the "Gift Type" radio button is changed
    document.getElementsByName("transaction.trbopts").forEach((el) => {
      el.addEventListener("change", (e) => {
        const radio = e.target as HTMLInputElement;
        const giftType: GiftType =
          radio.value === "In Honor" ? "HONORARY" : "MEMORIAL";
        this.configureForm(giftType, this.giftNotification);
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
    const firstHeading = document.querySelector(
      ".form-heading.ihmo-content h3"
    );
    const thirdHeading = document.querySelectorAll(
      ".form-heading.ihmo-content h3"
    )[2];

    if (!firstHeading || !thirdHeading) return;

    if (this.giftType === "HONORARY") {
      firstHeading.textContent = "PERSON TO BE HONORED";
      thirdHeading.textContent = "HONOREE'S PERSONAL INFORMATION";
      if (
        this.giftNotification === "ECARD" ||
        this.giftNotification === "NONE"
      ) {
        thirdHeading.closest(".form-heading")?.classList.add("hide");
      } else {
        thirdHeading.closest(".form-heading")?.classList.remove("hide");
      }
    } else {
      firstHeading.textContent = "PERSON TO BE REMEMBERED";
      thirdHeading.textContent = "PERSON TO BE NOTIFIED";
      if (this.giftNotification === "NONE") {
        thirdHeading.closest(".form-heading")?.classList.add("hide");
      } else {
        thirdHeading.closest(".form-heading")?.classList.remove("hide");
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
      el.classList.add("en__hidden");
      el.querySelector(".en__field__input")?.setAttribute(
        "disabled",
        "disabled"
      );
    }
  }

  private showField(field: string | Element) {
    const el = field instanceof Element ? field : document.querySelector(field);
    if (el) {
      el.classList.remove("en__hidden");
      el.querySelector(".en__field__input")?.removeAttribute("disabled");
    }
  }
}
