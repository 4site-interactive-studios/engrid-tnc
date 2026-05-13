import {
  ENGrid,
  EngridLogger,
  IframeQueue,
  EnForm,
} from "@4site/engrid-scripts"; // Uses ENGrid via NPM
import { GdcpField } from "./interfaces/gdcp-field.interface";
import { gdcpFields } from "./config/gdcp-fields";
import { GdcpFieldManager } from "./gdcp-field-manager";
import { RuleHandler } from "./rule-handler";
import { pages } from "./config/pages";

declare global {
  interface Window {
    DisableGlobalDigitalCompliance?: boolean;
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

  /**
   * Deferred used to signal when the QCB iframe queue's outcome has
   * been decided — i.e. either the chain finished (success or error)
   * or it was determined there's no chain to run (not a Thank You
   * page, no supporter email, or no pending QCB sessions).
   *
   * BequestLightbox awaits this before opening so the bequest iframe
   * isn't competing with EN's form-submission machinery while QCB
   * iframes are in flight. The promise is created at class-load time
   * so callers (notably BequestLightbox, which is constructed before
   * GdcpManager in TNC's bootstrap) get a stable reference regardless
   * of construction order.
   */
  private static _qcbChainDecidedResolve: (() => void) | null = null;
  private static _qcbChainDecidedPromise: Promise<void> = new Promise(
    (resolve) => {
      GdcpManager._qcbChainDecidedResolve = resolve;
    }
  );

  /**
   * Returns a promise that resolves once GdcpManager has finished
   * dealing with any pending QCB iframe submissions for the current
   * page — including the "nothing to do" case. Safe to call before
   * GdcpManager is instantiated.
   */
  public static qcbChainDecided(): Promise<void> {
    return GdcpManager._qcbChainDecidedPromise;
  }

  /** Idempotent resolve of the qcb-chain-decided deferred. */
  private resolveQcbChainDecided() {
    if (GdcpManager._qcbChainDecidedResolve) {
      GdcpManager._qcbChainDecidedResolve();
      GdcpManager._qcbChainDecidedResolve = null;
    }
  }

  constructor() {
    // Kick off the async QCB follow-up flow. We don't `await` here —
    // the rest of the constructor proceeds with the usual GDCP setup,
    // and BequestLightbox coordinates via `qcbChainDecided()`.
    void this.queueGdcpFollowUps();
    if (!this.shouldRun()) {
      ENGrid.setBodyData("gdcp", "false");
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
        this.createMobilePhoneSessionStorageListener();
        this.watchForLocationChange();
        this.setSingleOptInModeInitialState();
        this.clearSessionState();
      });
    });
    this.onSubmit();
  }

  /**
   * GDCP will run unless explicitly disabled
   */
  private shouldRun(): boolean {
    return window.DisableGlobalDigitalCompliance !== true;
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
      ".en__field--email, .en__field--emailAddress"
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
    // @ts-ignore
    const fieldHtmlLabel = window.pageJson.locale.startsWith("es")
      ? gdcpField.gdcpFieldHtmlLabelEs
      : gdcpField.gdcpFieldHtmlLabel;

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
                    ${fieldHtmlLabel}
                  </label>
              </div>
              <div class="en__field__item">
                <div class="gdcp-field-text-description ${gdcpField.channel}-description hide">
                  ${fieldHtmlLabel}
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

    if (!dataFieldPresent) {
      return false;
    }

    const optInFieldsNames = gdcpField.optInFieldNames
      .map((name: string) => `[name="${name}"]`)
      .join(", ");
    const optInFieldsPresent = document.querySelector(optInFieldsNames);

    if (
      gdcpField.channel !== "postal_mail" &&
      gdcpField.channel !== "mobile_phone"
    ) {
      return !!dataFieldPresent && !!optInFieldsPresent;
    }

    if (gdcpField.channel === "postal_mail") {
      try {
        const postalMailOptInFieldPresent = await this.isPresentOnEmbeddedForm(
          this.pages.postal_mail_qcb,
          `#en__field_supporter_questions_1942219`
        );
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

    // mobile_phone
    try {
      const mobilePhoneOptInFieldPresent = await this.isPresentOnEmbeddedForm(
        this.pages.mobile_phone_qcbs,
        `#en__field_supporter_questions_848527, #en__field_supporter_questions_848528`
      );
      return (
        !!dataFieldPresent &&
        !!optInFieldsPresent &&
        mobilePhoneOptInFieldPresent
      );
    } catch (e) {
      this.logger.error("Error checking if opted into mobile phone", e);
      return false;
    }
  }

  /*
   * Check if a given element is present on an embedded form (iframe)
   */
  private async isPresentOnEmbeddedForm(
    pageUrl: string,
    selector: string
  ): Promise<boolean> {
    const iframe = this.createChainedIframeForm(pageUrl);

    await new Promise((resolve, reject) => {
      iframe.addEventListener("load", resolve);
      iframe.addEventListener("error", reject);
    });

    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;
    let elementInIframe = iframeDocument?.querySelector(selector);

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
    this.gdcpFieldManager.clearStateFromSession();
  }

  /**
   * Enqueue any pending GDCP follow-up iframe submissions onto the shared
   * IframeQueue and start processing. Replaces three independent
   * setTimeout-spaced submissions which suffered ~40% record loss when
   * EN handled concurrent iframe submits. The queue processes items
   * strictly sequentially (the next iframe is created only after the
   * previous one reaches its Thank You page), without `?chain`.
   *
   * Asynchronous because resolving the supporter email goes through
   * EN's async `enjs.getPageData` callback (the synchronous
   * `getSupporterData` XHR is unreliable in modern browsers — see
   * the comment on `resolveSupporterEmail`). The method always
   * resolves the static `qcbChainDecided` promise on the way out so
   * BequestLightbox can stop waiting regardless of which branch was
   * taken (skipped, errored, or completed).
   */
  private async queueGdcpFollowUps(): Promise<void> {
    try {
      // QCB follow-up work is signalled by sessionStorage entries
      // written by an earlier form submission (donation, advocacy,
      // etc.). If none of those entries are present (or all of them
      // were written on the current page), there's nothing to do —
      // skip silently. This avoids a spurious "supporter email not
      // found" error log on every entry page that has no pending
      // QCB session data.
      //
      // We intentionally do NOT gate this on isThankYouPage(). Some
      // client flows chain pages across page types (e.g. an
      // advocacy Thank You page that redirects via `?chain` into a
      // donation form page 1), and on those chained pages the
      // earlier-page sessionData is still pending and EN pre-fills
      // the supporter email field, so the chain can run there.
      if (!this.hasPendingQcbWork()) return;

      // EN's QCB forms need the supporter's email to match the
      // record to a supporter — the job `?chain` used to do
      // server-side. If we can't find one, no QCB record can be
      // created, so we bail out loudly rather than queueing iframes
      // that are guaranteed to time out.
      const email = await this.resolveSupporterEmail();
      if (!email) {
        this.logger.error(
          "Skipping QCB iframe queue: could not resolve supporter " +
            "email. EN's `enjs.getPageData` did not return a valid " +
            "`emailAddress`. Check that the /pagedata response on " +
            "this Thank You page contains supporter data."
        );
        return;
      }

      const queue = IframeQueue.getInstance();
      this.maybeEnqueueDoubleOptInEmail(queue, email);
      this.maybeEnqueuePostalMailQcb(queue, email);
      this.maybeEnqueueMobilePhoneQcb(queue, email);

      if (queue.size === 0 && !queue.isProcessing) return;

      this.logger.log(
        `Starting iframe queue with ${queue.size} pending follow-up(s).`
      );
      // Await the chain so callers awaiting `qcbChainDecided()` only
      // see the promise resolve after the queue is done.
      await queue.process().catch((err) => {
        this.logger.error("Iframe queue rejected:", err);
      });
    } finally {
      this.resolveQcbChainDecided();
    }
  }

  /**
   * Returns true when any of the three QCB sessionStorage entries
   * indicates pending work on the current page (i.e. the entry was
   * written on a previous page in the flow and hasn't been consumed
   * yet, and the prior submission didn't fail). Used as a cheap
   * early bail-out in `queueGdcpFollowUps` before any email
   * resolution work is done.
   */
  private hasPendingQcbWork(): boolean {
    const keys = [
      "gdcp-email-double-opt-in",
      "gdcp-postal-mail-create-qcb",
      "gdcp-mobile-phone-create-qcb",
    ];
    for (const key of keys) {
      let data: { page?: string };
      try {
        data = JSON.parse(sessionStorage.getItem(key) || "{}");
      } catch {
        continue;
      }
      if (
        data.page &&
        data.page !== window.location.pathname &&
        !this.submissionFailed
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolve the supporter's email address, trying sources in this
   * order:
   *
   *   1. `ENGrid.getFieldValue("supporter.emailAddress")` — synchronous
   *      read of the supporter email form field. On chained pages
   *      (e.g. advocacy Thank You → donation page 1 via `?chain`)
   *      EN pre-fills supporter fields on the next page, so the
   *      email is right there with no XHR required. This is the
   *      hot path for the chained-page scenario.
   *
   *   2. EN's async `enjs.getPageData` API — callback-based, reads
   *      the supporter from EN's in-page data layer (the `/pagedata`
   *      response). Used on pages where the email isn't echoed onto
   *      a form field (typical TY page after a standalone donation).
   *      Chosen over the synchronous `enjs.getSupporterData` because
   *      that one's underlying XHR is set with `async: false`, which
   *      modern browsers (Chrome, Firefox) routinely block or abort
   *      silently in cross-origin / iframe contexts. When that
   *      happens EN caches an empty result and every later call
   *      returns the empty cache. `getPageData` is the well-behaved
   *      callback-based alternative on the same data source — it
   *      caches into `enjs._pageDataResponse` and replays for
   *      subsequent callers, so it's reliable and idempotent.
   *
   * The validation regex is intentionally lenient — EN already
   * validated the email on submission, so we're just guarding
   * against empty strings or obviously malformed values. Resolves
   * to null after a 30s timeout if EN's framework isn't loaded or
   * the /pagedata call hangs.
   */
  private resolveSupporterEmail(): Promise<string | null> {
    return new Promise((resolve) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const maxWaitMs = 30000;
      let settled = false;

      const finish = (email: string | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(email);
      };

      const timeoutId = window.setTimeout(() => {
        this.logger.error(
          `resolveSupporterEmail: timed out after ${maxWaitMs}ms ` +
            `waiting for EN's getPageData callback.`
        );
        finish(null);
      }, maxWaitMs);

      // Source 1: supporter email field on the current page (synchronous).
      const fromField = ENGrid.getFieldValue("supporter.emailAddress");
      if (typeof fromField === "string" && emailRegex.test(fromField)) {
        finish(fromField);
        return;
      }

      // Source 2: EN's async getPageData (XHR-backed, cached).
      if (
        !ENGrid.checkNested(
          window.EngagingNetworks,
          "require",
          "_defined",
          "enjs",
          "getPageData"
        )
      ) {
        finish(null);
        return;
      }

      try {
        window.EngagingNetworks.require._defined.enjs.getPageData(
          (data: { emailAddress?: unknown } | undefined) => {
            const email = data?.emailAddress;
            if (typeof email === "string" && emailRegex.test(email)) {
              finish(email);
            } else {
              finish(null);
            }
          },
          (_err: unknown) => {
            finish(null);
          }
        );
      } catch {
        finish(null);
      }
    });
  }

  /**
   * Enqueue the double-opt-in email trigger iframe, if the session data
   * indicates the supporter just opted in to email on a different page.
   */
  private maybeEnqueueDoubleOptInEmail(queue: IframeQueue, email: string) {
    const sessionData = JSON.parse(
      sessionStorage.getItem("gdcp-email-double-opt-in") || "{}"
    );
    const shouldSend =
      sessionData.page &&
      sessionData.page !== window.location.pathname &&
      !this.submissionFailed;
    if (!shouldSend) return;

    const url = this.pages.double_opt_in_email_trigger;
    queue.enqueue({
      url,
      fields: { "supporter.emailAddress": email },
      autoSubmit: true,
      // keepIframeOnError: true, // uncomment to debug (or enable ENgrid debug mode)
      onComplete: () => {
        this.logger.log(`Double opt-in email sent via iframe queue: ${url}`);
      },
      onError: (error) => {
        this.logger.error(
          `Double opt-in email iframe queue item failed: ${error.message}`
        );
      },
    });
    sessionStorage.removeItem("gdcp-email-double-opt-in");
  }

  /**
   * Enqueue the postal-mail QCB iframe, if the session data indicates a
   * QCB needs to be recorded. When the supporter opted out (state === "N")
   * we still enqueue, but pass the negative answer via the populate
   * message so the embedded form records the negative QCB.
   */
  private maybeEnqueuePostalMailQcb(queue: IframeQueue, email: string) {
    const sessionData = JSON.parse(
      sessionStorage.getItem("gdcp-postal-mail-create-qcb") || "{}"
    );
    const shouldCreateQcb =
      sessionData.page &&
      sessionData.page !== window.location.pathname &&
      !this.submissionFailed;
    if (!shouldCreateQcb) return;

    const fields: Record<string, string> = {
      "supporter.emailAddress": email,
    };
    if (sessionData.state === "N") {
      fields["supporter.questions.1942219"] = "N";
    }

    const url = this.pages.postal_mail_qcb;
    queue.enqueue({
      url,
      fields,
      autoSubmit: true,
      // keepIframeOnError: true, // uncomment to debug (or enable ENgrid debug mode)
      onComplete: () => {
        this.logger.log(
          `Postal mail QCB created via iframe queue (state=${
            sessionData.state || "Y"
          }).`
        );
      },
      onError: (error) => {
        this.logger.error(
          `Postal mail QCB iframe queue item failed: ${error.message}`
        );
      },
    });
    sessionStorage.removeItem("gdcp-postal-mail-create-qcb");
  }

  /**
   * Enqueue the mobile-phone QCB iframe, if the session data indicates
   * a QCB needs to be recorded. Negative QCBs are intentionally not
   * created for the mobile-phone channel — when state === "N" the
   * session marker is cleared and no iframe is enqueued.
   */
  private maybeEnqueueMobilePhoneQcb(queue: IframeQueue, email: string) {
    const sessionData = JSON.parse(
      sessionStorage.getItem("gdcp-mobile-phone-create-qcb") || "{}"
    );
    const shouldCreateQcb =
      sessionData.page &&
      sessionData.page !== window.location.pathname &&
      !this.submissionFailed;
    if (!shouldCreateQcb) return;

    if (sessionData.state === "N") {
      // Negative QCBs are not recorded for the mobile-phone channel.
      sessionStorage.removeItem("gdcp-mobile-phone-create-qcb");
      this.logger.log(
        "Skipping mobile phone QCB (state=N — negative QCBs are not recorded for this channel)."
      );
      return;
    }

    const url = this.pages.mobile_phone_qcbs;
    queue.enqueue({
      url,
      fields: { "supporter.emailAddress": email },
      autoSubmit: true,
      // keepIframeOnError: true, // uncomment to debug (or enable ENgrid debug mode)
      onComplete: () => {
        this.logger.log(`Mobile phone QCB created via iframe queue: ${url}`);
      },
      onError: (error) => {
        this.logger.error(
          `Mobile phone QCB iframe queue item failed: ${error.message}`
        );
      },
    });
    sessionStorage.removeItem("gdcp-mobile-phone-create-qcb");
  }

  /**
   * Create a hidden chained iframe (with `?chain` and optional
   * `?autosubmit=Y`). Used **only** by `isPresentOnEmbeddedForm` for
   * synchronous DOM inspection — that flow loads an iframe, waits for
   * `load`, and reads the document, without submitting. The
   * post-submission QCB / opt-in chains use the IframeQueue component
   * instead and never go through this helper.
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

  private createMobilePhoneSessionStorageListener() {
    const gdcpFieldName = this.gdcpFields.find(
      (field) => field.channel === "mobile_phone"
    )?.gdcpFieldName;

    const mobilePhoneGdcpField = ENGrid.getField(gdcpFieldName || "");

    if (!mobilePhoneGdcpField) {
      // GDCP isn't enabled for mobile phone on this page
      return;
    }

    const fields = [
      mobilePhoneGdcpField,
      ENGrid.getField("supporter.phoneNumber2"),
      ENGrid.getField("supporter.country"),
    ]
      .filter(Boolean)
      .flat() as HTMLInputElement[];

    // Do an initial call to handle the current state (if pre-filled)
    this.setMobilePhoneSessionItem();
    fields.forEach((field) => {
      field?.addEventListener(
        "change",
        this.setMobilePhoneSessionItem.bind(this)
      );
    });
  }

  private setMobilePhoneSessionItem() {
    const gdcpFieldName = this.gdcpFields.find(
      (field) => field.channel === "mobile_phone"
    )?.gdcpFieldName;

    const checked = this.gdcpFieldManager.getField(
      gdcpFieldName || ""
    )?.checked;

    if (
      ENGrid.getFieldValue("supporter.phoneNumber2") !== "" &&
      ENGrid.getFieldValue("supporter.country") === "US"
    ) {
      sessionStorage.setItem(
        "gdcp-mobile-phone-create-qcb",
        JSON.stringify({
          state: checked ? "Y" : "N",
          page: window.location.pathname,
        })
      );
      this.logger.log(
        `Mobile Phone channel will create QCB with status: ${
          checked ? "Y" : "N"
        }`
      );
    } else {
      sessionStorage.removeItem("gdcp-mobile-phone-create-qcb");
      this.logger.log(
        `Mobile Phone channel missing required data, won't create a QCB`
      );
    }
  }
}
