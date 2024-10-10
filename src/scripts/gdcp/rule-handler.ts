import { GdcpField } from "./interfaces/gdcp-field.interface";
import { EngridLogger } from "@4site/engrid-common";
import { OptInRule } from "./interfaces/opt-in-rule.interface";
import { gdcpFields } from "./config/gdcp-fields";
import { GeographicalRule } from "./interfaces/geographical-rule.interface";
import { geographicalOptInRules } from "./config/geographical-opt-in-rules";
import { defaultOptInRules } from "./config/default-opt-in-rules";
import { strictOptInRules } from "./config/strict-opt-in-rules";
import { GdcpFieldManager } from "./gdcp-field-manager";

export class RuleHandler {
  private logger: EngridLogger = new EngridLogger(
    "GDCP",
    "#00ff00",
    "#000000",
    "🤝"
  );
  private gdcpFields: GdcpField[] = gdcpFields;
  private readonly geographicalRules: GeographicalRule[] =
    geographicalOptInRules;
  private readonly defaultRules: OptInRule[] = defaultOptInRules;
  private readonly strictRules: OptInRule[] = strictOptInRules;
  private activeRules: OptInRule[] = [];
  private strictMode: boolean = false;

  constructor(private gdcpFieldManager: GdcpFieldManager) {}

  /**
   * Get the opt in rules for a given location ("{country}-{region}")
   * If no rules are found for the region, fall back to the country
   * If no rules are found for the country, fall back to "Other"
   */
  getRulesForLocation(location: string): OptInRule[] {
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
  applyOptInRules(location: string): OptInRule[] {
    const locationRules = this.getRulesForLocation(location);

    //If the rules for the new location match rules for the current location, do nothing
    if (locationRules === this.activeRules) {
      this.logger.log(
        `Rules that match the rules for "${location}" are already active. Not applying new rules.`
      );
      return this.activeRules;
    }

    this.activeRules = locationRules;

    locationRules.forEach((rule) => {
      const gdcpField = this.gdcpFields.find(
        (field) => field.channel === rule.channel
      );

      if (gdcpField) {
        this.applyRule(rule, gdcpField);
      }
    });

    return this.activeRules;
  }

  applyRule(rule: OptInRule, gdcpField: GdcpField): boolean {
    const dataInputEl = document.querySelector(
      `input[name="${gdcpField.dataFieldName}"]`
    );
    if (!dataInputEl) {
      this.logger.log(
        `Could not find data field for "${gdcpField.channel}" - skipping rule`
      );
      return false;
    }

    const activeRule = dataInputEl
      .closest(".en__field")
      ?.classList.contains("en__mandatory")
      ? rule.rule
      : rule.optionalRule;

    switch (activeRule) {
      case "preselected_checkbox":
        this.preselectedCheckedRule(gdcpField);
        break;
      case "checkbox":
        this.checkboxRule(gdcpField);
        break;
      case "double_opt_in":
        this.doubleOptInRule(gdcpField);
        break;
      case "hidden":
        this.hiddenCheckboxRule(gdcpField);
        break;
      case "hidden_no_qcb":
        this.hiddenNoQcbRule(gdcpField);
        break;
      default:
        this.logger.log(
          `Unknown rule "${rule.rule} - falling back to an unselected checkbox"`
        );
        this.checkboxRule(gdcpField);
        break;
    }

    return true;
  }

  setStrictMode(strictMode: boolean) {
    this.strictMode = strictMode;
  }

  /**
   * Rule for preselected checkbox
   * Check the GDCP field and all its associated opt-in fields
   */
  preselectedCheckedRule(gdcpField: GdcpField) {
    this.gdcpFieldManager.setChecked(gdcpField.gdcpFieldName, true);
    this.gdcpFieldManager.setVisibility(gdcpField.gdcpFieldName, true);
  }

  /**
   * Rule for checkbox
   * Uncheck the GDCP field and all its associated opt-in fields
   */
  checkboxRule(gdcpField: GdcpField) {
    this.gdcpFieldManager.setChecked(gdcpField.gdcpFieldName, false);
    this.gdcpFieldManager.setVisibility(gdcpField.gdcpFieldName, true);
  }

  /**
   * Rule for hidden checkbox
   * Visually hide the GDCP field
   * Show the hidden field text
   * Check the GDCP field and all its associated opt-in fields
   */
  hiddenCheckboxRule(gdcpField: GdcpField) {
    this.gdcpFieldManager.setChecked(gdcpField.gdcpFieldName, true);
    this.gdcpFieldManager.setVisibility(gdcpField.gdcpFieldName, false);
  }

  //TODO: Implement this rule
  doubleOptInRule(gdcpField: GdcpField) {
    return true;
  }

  //TODO: Implement this rule
  hiddenNoQcbRule(gdcpField: GdcpField) {
    this.hiddenCheckboxRule(gdcpField);
  }
}
