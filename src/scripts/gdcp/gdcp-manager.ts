import { OptInRule } from "./interfaces/opt-in-rule.interface";
import { GdcpField } from "./interfaces/gdcp-field.interface";
import { GeographicalRule } from "./interfaces/geographical-rule.interface";
import { geographicalOptInRules } from "./config/geographical-opt-in-rules";
import { defaultOptInRules } from "./config/default-opt-in-rules";
import { strictOptInRules } from "./config/strict-opt-in-rules";
import { gdcpFields } from "./config/gdcp-fields";
import { ENGrid, EngridLogger } from "@4site/engrid-common";
import {
  checkboxRule,
  doubleOptInRule,
  hiddenCheckboxRule,
  hiddenNoQcbRule,
  preselectedCheckedRule,
} from "./consent-rules";

declare global {
  interface Window {
    GlobalDigitalComplianceStrictMode?: boolean;
  }
}

export class GdcpManager {
  private logger: EngridLogger = new EngridLogger(
    "GDCP",
    "#00ff00",
    "#000000",
    "🤝"
  );
  private readonly geographicalRules: GeographicalRule[] =
    geographicalOptInRules;
  private readonly defaultRules: OptInRule[] = defaultOptInRules;
  private readonly strictRules: OptInRule[] = strictOptInRules;
  private readonly strictMode: boolean = false;
  private gdcpFields: GdcpField[] = gdcpFields;
  private userLocation: string = "";

  constructor() {
    if (!this.shouldRun()) return;
    this.strictMode = window.GlobalDigitalComplianceStrictMode || false;
    this.logger.log(
      `GDCP is running. Strict mode is ${
        this.strictMode ? "enabled" : "disabled"
      }.`
    );
    ENGrid.setBodyData("gdcp", "true");
    this.setupGdcpFields();
    this.getInitialLocation().then((location) => {
      this.userLocation = location;
      this.applyOptInRules(this.userLocation);
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
   * Handles getting the user's initial location based on the fields available on the page
   * If the country field is present, use that (and the region field if present).
   * This field is set from Cloudflare by the auto-country-select.ts module of ENgrid.
   * If the country field is present, the user's country is the US, and the region field is not present, add a region field to the page.
   * If the country field is not present, fetch the user's location from Cloudflare trace endpoint. If the user's country is the US, and the region field is not present, add a region field to the page.
   */
  //TODO: separate the initial location logic from createUSStatesField logic..
  private async getInitialLocation(): Promise<string> {
    const countryField = ENGrid.getField("supporter.country");
    const regionField = ENGrid.getField("supporter.region");

    if (countryField) {
      const country = ENGrid.getFieldValue("supporter.country");
      if (!regionField && country === "US") {
        this.logger.log(
          "Country field value is US and state field is missing, adding state field to page"
        );
        this.createUSStatesField();
      }
      return `${country}-${ENGrid.getFieldValue("supporter.region")}`;
    }

    let country = "";

    await fetch(`https://${window.location.hostname}/cdn-cgi/trace`)
      .then((res) => res.text())
      .then((t) => {
        let data = t.replace(/[\r\n]+/g, '","').replace(/\=+/g, '":"');
        data = '{"' + data.slice(0, data.lastIndexOf('","')) + '"}';
        const jsondata = JSON.parse(data);
        country = jsondata.loc;
      })
      .catch((err) => {
        this.logger.log(
          "No country field and error fetching location data. Falling back to US.",
          err
        );
        country = "unknown";
      });

    if (country === "US" && !regionField) {
      this.logger.log(
        "Country value from CF is US and state field is missing, adding state field to page."
      );
      this.createUSStatesField();
    }

    return country;
  }

  /**
   * Create US states field and add it to the page
   * When positioning on the page, we always use flexbox ordering
   * to prevent issues with the i-hide i-50 etc helper classes
   */
  private createUSStatesField() {
    if (ENGrid.getField("supporter.region")) {
      //If the state field is already on the page, no need to add it again
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

    if (countryField) {
      countryField.addEventListener("change", () => {
        const country = ENGrid.getFieldValue("supporter.country");
        if (country === "US" && !regionField) {
          this.logger.log(
            "Country field value changed to US and state field is missing, adding state field to page"
          );
          this.createUSStatesField();
        }

        this.userLocation = `${country}-${ENGrid.getFieldValue(
          "supporter.region"
        )}`;

        this.applyOptInRules(this.userLocation);
      });
    }

    if (regionField) {
      regionField.addEventListener("change", () => {
        //Must always have country value - fall back to our initial value if country field if not on page
        const country =
          ENGrid.getFieldValue("supporter.country") ||
          this.userLocation.split("-")[0];
        this.userLocation = `${country}-${ENGrid.getFieldValue(
          "supporter.region"
        )}`;

        this.applyOptInRules(this.userLocation);
      });
    }
  }

  /**
   * Get the opt in rules for a given location ("{country}-{region}")
   * If no rules are found for the region, fall back to the country
   * If no rules are found for the country, fall back to "Other"
   */
  private getRulesForLocation(location: string): OptInRule[] {
    //If we're in strict mode, always use that.
    if (this.strictMode) {
      this.logger.log(`Using strict mode rules`, this.strictRules);
      return this.strictRules;
    }

    //Find an exact match for the location country+region "{country}-{region}"
    let rule = this.geographicalRules.find((rule) =>
      rule.locations.includes(location)
    );
    if (rule) {
      this.logger.log(`Found rules for location "${location}"`, rule.rules);
      return rule.rules;
    }

    //Find a match for the location country "{country}"
    const country = location.split("-")[0];
    rule = this.geographicalRules.find((rule) =>
      rule.locations.includes(country)
    );
    if (rule) {
      this.logger.log(
        `No exact rules for "${location}". Found rules for country "${country}"`,
        rule.rules
      );
      return rule.rules;
    }

    //Fall back to the default rules
    this.logger.log(
      `No rules found for "${location}" - falling back to default`,
      this.defaultRules
    );
    return this.defaultRules;
  }

  /**
   * Apply the opt in rules for a given location to each GDCP Field
   */
  private applyOptInRules(location: string) {
    const locationRules = this.getRulesForLocation(location);

    //TODO: don't reapply rules if the same rules are already active?

    locationRules.forEach((rule) => {
      const gdcpField = this.gdcpFields.find(
        (field) => field.channel === rule.channel
      );

      if (gdcpField) {
        this.applyRule(rule, gdcpField);
      }
    });
  }

  /**
   * Apply a given opt in rule to a given GDCP Field
   * Determines if the rule is for a mandatory or optional field and applies the correct rule
   */
  private applyRule(rule: OptInRule, gdcpField: GdcpField): void {
    const dataInputEl = document.querySelector(
      `input[name="${gdcpField.dataFieldName}"]`
    );
    if (!dataInputEl) {
      this.logger.log(
        `Could not find data field for "${gdcpField.channel}" - skipping rule`
      );
      return;
    }

    // Select the correct rule based on if the field is mandatory or optional
    const activeRule = dataInputEl
      .closest(".en__field")
      ?.classList.contains("en__mandatory")
      ? rule.rule
      : rule.optionalRule;

    switch (activeRule) {
      case "preselected_checkbox":
        preselectedCheckedRule(gdcpField);
        break;
      case "checkbox":
        checkboxRule(gdcpField);
        break;
      case "double_opt_in":
        doubleOptInRule(gdcpField);
        break;
      case "hidden":
        hiddenCheckboxRule(gdcpField);
        break;
      case "hidden_no_qcb":
        hiddenNoQcbRule(gdcpField);
        break;
      default:
        this.logger.log(
          `Unknown rule "${rule.rule} - falling back to an unselected checkbox"`
        );
        checkboxRule(gdcpField);
        break;
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
      input.addEventListener("change", (event) => {
        this.toggleAllOptInFields(
          gdcpField,
          (event.target as HTMLInputElement).checked
        );
      });
    }

    return input;
  }

  /**
   * Toggle all the opt in fields for a given GDCP Field
   */
  private toggleAllOptInFields(gdcpField: GdcpField, checked: boolean) {
    this.logger.log(
      `Settings opt in fields for "${gdcpField.channel}" to ${checked}`
    );

    gdcpField.optInFieldNames.forEach((name) => {
      const input = document.querySelector(
        `[name="${name}"]`
      ) as HTMLInputElement;
      if (input) {
        input.checked = checked;
      }
    });
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
}
