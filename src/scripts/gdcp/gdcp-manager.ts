import { ENGrid, EngridLogger } from "@4site/engrid-common";
import { GdcpField } from "./interfaces/gdcp-field.interface";
import { gdcpFields } from "./config/gdcp-fields";
import { GdcpFieldManager } from "./gdcp-field-manager";
import { RuleHandler } from "./rule-handler";

declare global {
  interface Window {
    GlobalDigitalComplianceStrictMode?: boolean;
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
  private readonly strictMode: boolean = false;
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

  constructor() {
    if (!this.shouldRun()) return;
    this.strictMode = window.GlobalDigitalComplianceStrictMode || false;
    this.ruleHandler.setStrictMode(this.strictMode);
    this.logger.log(
      `GDCP is running. Strict mode is ${
        this.strictMode ? "active" : "not active"
      }.`
    );
    ENGrid.setBodyData("gdcp", "true");
    this.addConsentStatementForExistingSupporters();
    this.setupGdcpFields();
    this.getInitialLocation().then((location) => {
      this.userLocation = location;
      this.logger.log(`Initial User location is ${this.userLocation}`);
      this.addStateFieldIfNeeded(this.userLocation);
      this.ruleHandler.applyOptInRules(this.userLocation);
      this.watchForLocationChange();
    });
  }

  /**
   * List of Page IDs where GDCP should be active
   */
  private shouldRun(): boolean {
    return [158050].includes(ENGrid.getPageID());
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
    if (location.startsWith("US") && !ENGrid.getField("supporter.region")) {
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
        this.ruleHandler.applyOptInRules(this.userLocation);
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

        this.ruleHandler.applyOptInRules(this.userLocation);
      });
      this.regionListenerAdded = true;
    }
  }

  /**
   * Setup the GDCP fields on the page
   * Determines if the required fields are present for a channel and creates the GDCP field
   * Hides the EN opt in fields for the GDCP field
   */
  private setupGdcpFields() {
    this.gdcpFields.forEach((gdcpField) => {
      if (this.enFieldsForGdcpFieldOnPage(gdcpField)) {
        this.logger.log(`Creating GDCP field for "${gdcpField.channel}"`);
        this.gdcpFieldManager.addField(gdcpField);
        this.createGdcpField(gdcpField);
        this.hideEnOptInFields(gdcpField);
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
    });
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
      <div class="en__field en__field--checkbox en__field--000000 pseudo-en-field en__field--${gdcpField.gdcpFieldName}">
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
          input.checked
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
  private enFieldsForGdcpFieldOnPage(gdcpField: GdcpField): boolean {
    const dataFieldPresent = document.querySelector(
      `[name="${gdcpField.dataFieldName}"]`
    );
    const optInFieldsNames = gdcpField.optInFieldNames
      .map((name: string) => `[name="${name}"]`)
      .join(", ");
    const optInFieldsPresent = document.querySelector(optInFieldsNames);
    return !!dataFieldPresent && !!optInFieldsPresent;
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
}
