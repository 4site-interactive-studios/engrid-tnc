import { ENGrid, EngridLogger } from "@4site/engrid-scripts";
import { GdcpField } from "./interfaces/gdcp-field.interface";
import { gdcpFields } from "./config/gdcp-fields";
import { GdcpFieldManager } from "./gdcp-field-manager";
import { RuleHandler } from "./rule-handler";
import { EnForm } from "@4site/engrid-scripts";
import { pages } from "./config/pages";

declare global {
  interface Window {
    GlobalDigitalComplianceActive?: boolean;
    GlobalDigitalComplianceStrictMode?: boolean;
    GlobalDigitalComplianceSingleOptIn?: boolean;
    EngagingNetworks: any;
  }
}

export class GdcpManager {
  private logger: EngridLogger = new EngridLogger(
    "GDCP",
    "#00ff00",
    "#000000",
    "🤝"
  );
  private gdcpFieldManager: GdcpFieldManager = new GdcpFieldManager();
  private ruleHandler: RuleHandler = new RuleHandler(this.gdcpFieldManager);
  private countryListenerAdded: boolean = false;
  private regionListenerAdded: boolean = false;
  private readonly strictMode: boolean =
    window.GlobalDigitalComplianceStrictMode || false;
  private readonly singleOptInMode: boolean =
    window.GlobalDigitalComplianceSingleOptIn || false;
  private gdcpFields: GdcpField[] = gdcpFields;
  private userLocation: string = "";
  private submissionFailed: boolean = !!(
    ENGrid.checkNested(
      window.EngagingNetworks,
      "require",
      "_defined",
      "enjs",
      "checkSubmissionFailed"
    ) && window.EngagingNetworks.require._defined.enjs.checkSubmissionFailed()
  );
  private _form: EnForm = EnForm.getInstance();
  private pages: Record<string, string> = pages;

  constructor() {
    this.handleDoubleOptInEmail();
    this.handlePostalMailQcb();
    if (!this.shouldRun()) {
      this.logger.log("GDCP is not running on this page.");
      return;
    }
    this.ruleHandler.setStrictMode(this.strictMode);
    this.logger.log(
      `GDCP is running. Strict mode is ${
        this.strictMode ? "active" : "not active"
      }.`
    );
    this.setupGdcpFields().then(() => {
      ENGrid.setBodyData("gdcp", "true");
      this.addConsentStatementForExistingSupporters();
      this.getInitialLocation().then((location) => {
        this.userLocation = location;
        this.logger.log(`Initial User location is ${this.userLocation}`);
        this.addStateFieldIfNeeded(this.userLocation);
        if (this.submissionFailed) {
          this.restoreFieldsStateFromSession();
        } else {
          this.applyRulesForLocation(this.userLocation, false);
        }
        this.watchForLocationChange();
        this.setSingleOptInModeInitialState();
        this.clearSessionState();
      });
    });
    this.onSubmit();
  }

  /**
   * List of Page IDs where GDCP should be active
   */
  private shouldRun(): boolean {
    return (
      [158050, 158972].includes(ENGrid.getPageID()) ||
      window.GlobalDigitalComplianceActive === true
    );
  }

  /**
   * Handles getting the user's initial location
   * In most cases this comes from CloudFlare
   * but in cases where data is prefilled or the submission has failed we get it from the country and region fields
   * fallback to "unknown" if no location data is found
   */
  private async getInitialLocation(): Promise<string> {
    let location = "unknown";

    const countryField = ENGrid.getField("supporter.country");
    const regionField = ENGrid.getField("supporter.region");
    const engridAutofill = this.getCookie("engrid-autofill");
    const locationDataInUrl =
      ENGrid.getUrlParameter("supporter.country") ||
      ENGrid.getUrlParameter("supporter.region") ||
      (ENGrid.getUrlParameter("ea.url.id") &&
        !ENGrid.getUrlParameter("forwarded"));

    // Get location from Cloudflare
    // Only run if there's no engrid-autofill cookie, the submission hasn't failed, and there's no location data in the URL
    if (!engridAutofill && !this.submissionFailed && !locationDataInUrl) {
      await fetch(`https://${window.location.hostname}/cdn-cgi/trace`)
        .then((res) => res.text())
        .then((t) => {
          let data = t.replace(/[\r\n]+/g, '","').replace(/=+/g, '":"');
          data = '{"' + data.slice(0, data.lastIndexOf('","')) + '"}';
          const jsonData = JSON.parse(data);
          location = jsonData.loc;
        })
        .catch((err) => {
          this.logger.log(
            "No country field and error fetching location data. Falling back to US.",
            err
          );
          location = "unknown";
        });
      return location;
    }

    // Get location from the country and region fields
    if (countryField) {
      location = ENGrid.getFieldValue("supporter.country");
      if (regionField && ENGrid.getFieldValue("supporter.region") !== "") {
        location += `-${ENGrid.getFieldValue("supporter.region")}`;
      }
      return location;
    }

    // No location data from Cloudflare + no location fields on page
    // Return default "Unknown" location
    return location;
  }

  /**
   * Handle adding the state field to the page if the user's location is the US and the state field is missing
   */
  private addStateFieldIfNeeded(location: string) {
    // If strict mode is active we don't need to add the state field
    if (this.strictMode) {
      return;
    }

    if (
      location.startsWith("US") &&
      !ENGrid.getField("supporter.region") &&
      this.gdcpFieldManager.getFields().size > 0
    ) {
      this.logger.log(
        "Location is US and state field is missing, adding state field to page"
      );
      this.createUSStatesField();
    }
  }

  /**
   * Create US states field and add it to the page
   * When positioning on the page, we always use flexbox ordering
   * to prevent issues with the i-hide i-50 etc helper classes
   */
  private createUSStatesField() {
    //If the state field is already on the page or we're in strict mode, no need to add it
    if (ENGrid.getField("supporter.region") || this.strictMode) {
      return;
    }

    const usStatesFieldHtml = `<div class="en__field en__field--select en__field--1984602 en__field--region">
                                <label for="en__field_supporter_region" class="en__field__label" style="">State or Province</label>
                                <div class="en__field__element en__field__element--select">
                                <select id="en__field_supporter_region" class="en__field__input en__field__input--select" name="supporter.region" autocomplete="address-level1" aria-required="true"><option value="">SELECT STATE/PROVINCE</option><option value="AK">Alaska</option><option value="AL">Alabama</option><option value="AZ">Arizona</option><option value="AR">Arkansas</option><option value="CA">California</option><option value="CO">Colorado</option><option value="CT">Connecticut</option><option value="DE">Delaware</option><option value="DC">District of Columbia</option><option value="FL">Florida</option><option value="GA">Georgia</option><option value="HI">Hawaii</option><option value="ID">Idaho</option><option value="IL">Illinois</option><option value="IN">Indiana</option><option value="IA">Iowa</option><option value="KS">Kansas</option><option value="KY">Kentucky</option><option value="LA">Louisiana</option><option value="ME">Maine</option><option value="MD">Maryland</option><option value="MA">Massachusetts</option><option value="MI">Michigan</option><option value="MN">Minnesota</option><option value="MS">Mississippi</option><option value="MO">Missouri</option><option value="MT">Montana</option><option value="NE">Nebraska</option><option value="NV">Nevada</option><option value="NH">New Hampshire</option><option value="NJ">New Jersey</option><option value="NM">New Mexico</option><option value="NY">New York</option><option value="NC">North Carolina</option><option value="ND">North Dakota</option><option value="OH">Ohio</option><option value="OK">Oklahoma</option><option value="OR">Oregon</option><option value="PA">Pennsylvania</option><option value="RI">Rhode Island</option><option value="SC">South Carolina</option><option value="SD">South Dakota</option><option value="TN">Tennessee</option><option value="TX">Texas</option><option value="UT">Utah</option><option value="VT">Vermont</option><option value="VA">Virginia</option><option value="WA">Washington</option><option value="WV">West Virginia</option><option value="WI">Wisconsin</option><option value="WY">Wyoming</option><option value="AA">Armed Forces Americas</option><option value="AE">Armed Forces Europe/Canada/Middle East/Africa</option><option value="AP">Armed Forces Pacific</option><option value="AS">American Samoa</option><option value="CZ">Canal Zone</option><option value="GU">Guam</option><option value="UM">Minor Outlying Islands</option><option value="MP">Northern Mariana Islands</option><option value="PR">Puerto Rico</option><option value="VI">Virgin Islands</option><option value="None">None</option></select>
                                </div>
                              </div>`;

    //If the page has a country field we will position the state field after it
    const countryField = document.querySelector(
      ".en__field--country"
    ) as HTMLElement;
    if (countryField) {
      countryField.parentElement?.insertAdjacentHTML(
        "beforeend",
        usStatesFieldHtml
      );

      //Doing the ordering here to prevent issues with the i-hide i-50 etc helper classes
      const children = countryField.parentElement?.children;
      let countryOrder;
      if (children) {
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLElement;
          child.style.order = i.toString();
          if (child.classList.contains("en__field--country")) {
            countryOrder = i;
          }
        }
      }
      document
        .querySelector(".en__field--region")
        ?.setAttribute("style", `order: ${countryOrder}`);

      this.watchForLocationChange();

      return;
    }

    //Else, if the page has an email field we will position it at the top of the form block
    const emailField = document.querySelector(
      ".en__field--email"
    ) as HTMLElement;
    if (emailField) {
      emailField.parentElement?.insertAdjacentHTML(
        "beforeend",
        usStatesFieldHtml
      );

      const regionField = document.querySelector(
        ".en__field--region"
      ) as HTMLElement;
      if (regionField) {
        //Position the region field as the first field inside the form block with the email field
        //Use flex ordering to do this to not interfere with the form's default order (and any iX- helper classes)
        regionField.style.order = "-1";
      }
      return;
    }
  }

  /**
   * Watch for changes in the user's location (country and region fields) and apply the opt in rules
   */
  private watchForLocationChange() {
    const countryField = ENGrid.getField("supporter.country");
    const regionField = ENGrid.getField("supporter.region");

    if (countryField && !this.countryListenerAdded) {
      countryField.addEventListener("change", () => {
        let location = ENGrid.getFieldValue("supporter.country");
        if (ENGrid.getFieldValue("supporter.region")) {
          location += `-${ENGrid.getFieldValue("supporter.region")}`;
        }
        this.userLocation = location;
        this.addStateFieldIfNeeded(this.userLocation);
        this.applyRulesForLocation(this.userLocation);
      });
      this.countryListenerAdded = true;
    }

    if (regionField && !this.regionListenerAdded) {
      regionField.addEventListener("change", () => {
        //Must always have country value - fall back to our initial value if country field if not on page
        const country =
          ENGrid.getFieldValue("supporter.country") ||
          this.userLocation.split("-")[0];
        this.userLocation = `${country}-${ENGrid.getFieldValue(
          "supporter.region"
        )}`;
        this.applyRulesForLocation(this.userLocation);
      });
      this.regionListenerAdded = true;
    }
  }

  /**
   * Setup the GDCP fields on the page
   * Determines if the required fields are present for a channel and creates the GDCP field
   * Hides the EN opt in fields for the GDCP field
   */
  private async setupGdcpFields() {
    for (const gdcpField of this.gdcpFields) {
      const enFieldsAreOnPage = await this.enFieldsForGdcpFieldOnPage(
        gdcpField
      );
      if (enFieldsAreOnPage) {
        this.gdcpFieldManager.addField(gdcpField);
        this.hideEnOptInFields(gdcpField);
        if (!this.singleOptInMode) {
          this.logger.log(`Creating GDCP field for "${gdcpField.channel}"`);
          this.createGdcpField(gdcpField);
        }
      } else {
        this.logger.log(
          `Did not find the required fields for channel "${
            gdcpField.channel
          }" - "${
            gdcpField.dataFieldName
          }" and any of opt in field(s) "${gdcpField.optInFieldNames.join(
            ", "
          )}". Skipping adding GDCP field for this channel to page.`
        );
      }
    }

    if (this.singleOptInMode && this.gdcpFieldManager.getFields().size > 0) {
      this.logger.log("Single Opt-In mode is active, creating checkbox");
      this.createSingleOptInCheckbox();
    }
  }

  private hideEnOptInFields(gdcpField: GdcpField) {
    gdcpField.optInFieldNames.forEach((name) => {
      const input = document.querySelector(
        `[name="${name}"]`
      ) as HTMLInputElement;

      input?.closest(".en__field")?.classList.add("hide");
    });
  }

  /**
   * Creates the GDCP field element and adds it to the page
   * Also adds an event listener to toggle all the opt in fields when the GDCP field is checked/unchecked
   */
  private createGdcpField(gdcpField: GdcpField): HTMLInputElement {
    const field = `
      <div class="en__field en__field--checkbox en__field--000000 pseudo-en-field engrid-gdcp-field en__field--${gdcpField.gdcpFieldName}">
          <div class="en__field__element en__field__element--checkbox">
              <div class="en__field__item">
                  <input 
                    class="en__field__input en__field__input--checkbox" 
                    id="en__field_${gdcpField.gdcpFieldName}" 
                    name="${gdcpField.gdcpFieldName}" 
                    type="checkbox" 
                    value="Y"
                  >
                  <label class="en__field__label en__field__label--item" for="en__field_${gdcpField.gdcpFieldName}">
                    ${gdcpField.gdcpFieldHtmlLabel}
                  </label>
              </div>
              <div class="en__field__item">
                <div class="gdcp-field-text-description ${gdcpField.channel}-description hide">
                  ${gdcpField.gdcpFieldHtmlLabel}
                </div>
              </div>
          </div>
      </div>`;

    const formElement = document
      .querySelector(`[name="${gdcpField.dataFieldName}"]`)
      ?.closest(".en__field");
    if (formElement) {
      formElement.insertAdjacentHTML("beforeend", field);
    }

    const input = document.querySelector(
      `[name="${gdcpField.gdcpFieldName}"]`
    ) as HTMLInputElement;
    if (input) {
      input.addEventListener("change", () => {
        this.gdcpFieldManager.setChecked(
          gdcpField.gdcpFieldName,
          input.checked,
          true
        );
        this.gdcpFieldManager.setTouched(gdcpField.gdcpFieldName);
      });
    }

    return input;
  }

  /**
   * Check if the corresponding EN fields are present on the page
   * for a given GDCP Opt In Field
   * i.e. Its data field + any of the opt in fields
   */
  private async enFieldsForGdcpFieldOnPage(
    gdcpField: GdcpField
  ): Promise<boolean> {
    const dataFieldPresent = document.querySelector(
      `[name="${gdcpField.dataFieldName}"]`
    );
    const optInFieldsNames = gdcpField.optInFieldNames
      .map((name: string) => `[name="${name}"]`)
      .join(", ");
    const optInFieldsPresent = document.querySelector(optInFieldsNames);

    if (gdcpField.channel !== "postal_mail") {
      return !!dataFieldPresent && !!optInFieldsPresent;
    }

    try {
      const postalMailOptInFieldPresent =
        await this.postalMailOptInFieldPresent();
      return (
        !!dataFieldPresent &&
        !!optInFieldsPresent &&
        postalMailOptInFieldPresent
      );
    } catch (e) {
      this.logger.error("Error checking if opted into postal mail", e);
      return false;
    }
  }

  private async postalMailOptInFieldPresent(): Promise<boolean> {
    const iframe = this.createChainedIframeForm(this.pages.postal_mail_qcb);

    await new Promise((resolve, reject) => {
      iframe.addEventListener("load", resolve);
      iframe.addEventListener("error", reject);
    });

    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;
    let elementInIframe = iframeDocument?.querySelector(
      "#en__field_supporter_questions_1942219"
    );

    return !!elementInIframe;
  }

  /**
   * Apply the opt in rules for the user's location
   * @param location The user's location
   * @param scrollToChangedField Whether to scroll to the field highest up the page that has changed state
   */
  private applyRulesForLocation(
    location: string,
    scrollToChangedField: boolean = true
  ) {
    const { checkedStateChangedFields } =
      this.ruleHandler.applyOptInRules(location);

    if (scrollToChangedField) {
      this.scrollUpToHighestChangedField(checkedStateChangedFields);
    }
  }

  /**
   * Scroll to the field highest up the page that has changed state
   */
  private scrollUpToHighestChangedField(
    checkedStateChangedFields: GdcpField[]
  ) {
    if (checkedStateChangedFields.length) {
      // Only rules that have a visible checkbox
      const visibleFields = checkedStateChangedFields.filter((field) => {
        const gdcpField = this.gdcpFieldManager.getField(field.gdcpFieldName);
        return gdcpField?.visible;
      });

      // Get the DOM element of the data field of the field highest up the page
      const firstChangedField = visibleFields
        .map((field) => {
          return document
            .querySelector(`[name="${field.dataFieldName}"]`)
            ?.closest(".en__field") as HTMLElement;
        })
        .filter((el) => el)
        .reduce((a, b) => {
          return a?.getBoundingClientRect().top < b?.getBoundingClientRect().top
            ? a
            : b;
        });

      if (firstChangedField) {
        const fieldTop =
          firstChangedField.getBoundingClientRect().top + window.scrollY;
        // Only scroll if the field is above the current scroll position
        if (fieldTop < window.scrollY) {
          firstChangedField.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }

  /**
   * Add a consent statement below the submit button for existing supporters
   */
  private addConsentStatementForExistingSupporters() {
    if (
      ENGrid.getFieldValue("supporter.emailAddress") &&
      !this.submissionFailed
    ) {
      const submitButtonBlock =
        document.querySelector(".en__submit")?.parentElement;
      const consentStatement = `
        <div class="gdcp-consent-statement">
          <p>
            You previously provided your communication preferences. If you wish to change those preferences, please 
            <a href="https://preserve.nature.org/page/87755/subscriptions/1?chain" target="_blank">click here</a>.
          </p>
        </div>
      `;
      submitButtonBlock?.insertAdjacentHTML("afterend", consentStatement);
    }
  }

  /**
   * Get the value of a cookie by name
   */
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

  /**
   * Actions for when EN form is submitted
   * @private
   */
  private onSubmit() {
    this._form.onSubmit.subscribe(() => {
      // Save the GDCP fields state to session (for restoring in case of submission errors)
      this.gdcpFieldManager.saveStateToSession();

      // Save the double opt in email state to session (for triggering the opt in confirmation email)
      const emailGdcpFieldName = this.gdcpFields.find(
        (field) => field.channel === "email"
      )?.gdcpFieldName;
      if (emailGdcpFieldName) {
        const emailField = this.gdcpFieldManager.getField(emailGdcpFieldName);
        if (emailField && emailField.checked && emailField.doubleOptIn) {
          sessionStorage.setItem("gdcp-email-double-opt-in", "Y");
        }
      }

      // If postal mail channel rule is NOT "hidden_no_qcb", save value to session
      // to trigger the QCB for postal mail on thank you page load
      const postalMailGdcpFieldName = this.gdcpFields.find(
        (field) => field.channel === "postal_mail"
      )?.gdcpFieldName;
      if (postalMailGdcpFieldName) {
        const postalMailField = this.gdcpFieldManager.getField(
          postalMailGdcpFieldName
        );
        if (postalMailField && postalMailField.rule !== "hidden_no_qcb") {
          const value = postalMailField.checked ? "Y" : "N";
          sessionStorage.setItem("gdcp-postal-mail-create-qcb", value);
        }
      }
    });
  }

  /**
   * Restore the state of the GDCP + Opt In fields from session storage
   * Used when the submission fails, instead of applying location-based rules again.
   */
  private restoreFieldsStateFromSession() {
    this.logger.log(
      "Detected submission failure. Restoring GDCP + Opt In field states."
    );
    this.gdcpFieldManager.applyStateFromSession();
  }

  /**
   * Clear the session storage state
   * @private
   */
  private clearSessionState() {
    sessionStorage.removeItem("gdcp-postal-mail-create-qcb");
    sessionStorage.removeItem("gdcp-email-double-opt-in");
    this.gdcpFieldManager.clearStateFromSession();
  }

  /**
   * Send double opt in email if the user has opted in and the page is not the first page
   */
  private handleDoubleOptInEmail() {
    const shouldSendDoubleOptInEmail =
      sessionStorage.getItem("gdcp-email-double-opt-in") === "Y" &&
      !this.submissionFailed;

    if (shouldSendDoubleOptInEmail) {
      // Set timeout because EN does not work properly if multiple forms are submitted in quick succession
      setTimeout(() => {
        const iframe = this.createChainedIframeForm(
          this.pages.double_opt_in_email_trigger,
          true
        );
        sessionStorage.removeItem("gdcp-email-double-opt-in");
        this.logger.log(
          `Sending double opt in email using form: ${iframe.getAttribute(
            "src"
          )}`
        );
      }, 1000);
    }
  }

  /**
   * Send QCB for postal mail if we have the session data to do that
   */
  private handlePostalMailQcb() {
    const shouldCreateQcb =
      sessionStorage.getItem("gdcp-postal-mail-create-qcb") &&
      !this.submissionFailed;

    if (shouldCreateQcb) {
      let url = this.pages.postal_mail_qcb;
      if (sessionStorage.getItem("gdcp-postal-mail-create-qcb") === "N") {
        url += "?supporter.questions.1942219=N";
      }
      // Set timeout because EN does not work properly if multiple forms are submitted in quick succession
      setTimeout(() => {
        const iframe = this.createChainedIframeForm(url, true);
        sessionStorage.removeItem("gdcp-postal-mail-create-qcb");
        this.logger.log(
          `Creating QCB for postal mail using form: ${iframe.getAttribute(
            "src"
          )}`
        );
      }, 3500);
    }
  }

  /**
   * Create an iframe form with autosubmit form
   */
  private createChainedIframeForm(
    urlString: string,
    autoSubmit: boolean = false
  ): HTMLIFrameElement {
    const url = new URL(urlString);
    url.searchParams.append("chain", "");
    if (autoSubmit) {
      url.searchParams.append("autosubmit", "Y");
    }
    const iframe = document.createElement("iframe");
    iframe.src = url.toString();
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    return iframe;
  }

  /**
   * Create a single opt in checkbox for the page
   */
  private createSingleOptInCheckbox(): HTMLInputElement {
    const field = `
      <div class="en__component en__component--formblock">
          <div class="en__field en__field--checkbox en__field--000000 pseudo-en-field engrid-gdcp-field en__field--gdcp-single-opt-in">
              <div class="en__field__element en__field__element--checkbox">
                  <div class="en__field__item">
                      <input
                        class="en__field__input en__field__input--checkbox"
                        id="en__field_gdcp-single-opt-in"
                        name="engrid.gdcp-single-opt-in"
                        type="checkbox"
                        value="Y"
                      >
                      <label class="en__field__label en__field__label--item" for="en__field_gdcp-single-opt-in">
                        I agree to receive communications from The Nature Conservancy.
                      </label>
                  </div>
              </div>
          </div>
      </div>`;

    const formElement = document.querySelector(".en__submit");
    if (formElement) {
      formElement
        .closest(".en__component--formblock")
        ?.insertAdjacentHTML("beforebegin", field);
    }

    const input = document.querySelector(
      `[name="engrid.gdcp-single-opt-in"]`
    ) as HTMLInputElement;
    if (input) {
      input.addEventListener("change", () => {
        this.gdcpFields.forEach((gdcpField) => {
          this.gdcpFieldManager.setChecked(
            gdcpField.gdcpFieldName,
            input.checked,
            true
          );
          this.gdcpFieldManager.setTouched(gdcpField.gdcpFieldName);
        });
      });
    }

    return input;
  }

  /**
   * Set the initial state of the GDCP fields to unchecked in single opt in mode
   * Set them to touched so that any location rule change won't modify the checked state
   * We still want the location based rules to apply so we have the double opt in and no qcb rules
   */
  private setSingleOptInModeInitialState() {
    if (this.singleOptInMode && !this.submissionFailed) {
      this.logger.log(
        "Single Opt-In Mode - Setting all opt-ins to unchecked as initial state."
      );
      this.gdcpFields.forEach((gdcpField) => {
        this.gdcpFieldManager.setChecked(gdcpField.gdcpFieldName, false, true);
        this.gdcpFieldManager.setTouched(gdcpField.gdcpFieldName);
      });
    }
  }
}
