import { GdcpField } from "./interfaces/gdcp-field.interface";
import { EngridLogger } from "@4site/engrid-common";
import { OptInRule } from "./interfaces/opt-in-rule.interface";
import { gdcpFields } from "./config/gdcp-fields";
import { GeographicalRule } from "./interfaces/geographical-rule.interface";
import { geographicalOptInRules } from "./config/geographical-opt-in-rules";
import { defaultOptInRules } from "./config/default-opt-in-rules";
import { strictOptInRules } from "./config/strict-opt-in-rules";
import { GdcpFieldManager } from "./gdcp-field-manager";
import { Channel } from "./interfaces/channel.type";

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
  private readonly defaultRules: OptInRule<Channel>[] = defaultOptInRules;
  private readonly strictRules: OptInRule<Channel>[] = strictOptInRules;
  private activeRules: OptInRule<Channel>[] = [];
  private strictMode: boolean = false;

  constructor(private gdcpFieldManager: GdcpFieldManager) {}

  /**
   * Get the opt in rules for a given location ("{country}-{region}")
   * If no rules are found for the region, fall back to the country
   * If no rules are found for the country, fall back to "Other"
   */
  private getRulesForLocation(location: string): OptInRule<Channel>[] {
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
   * @return {checkedStateChangedFields} An array of GDCP Fields whose checked state has changed
   * @return {activeRules} The rules that were applied
   */
  applyOptInRules(location: string): {
    activeRules: OptInRule<Channel>[];
    checkedStateChangedFields: GdcpField[];
  } {
    const locationRules = this.getRulesForLocation(location);
    const checkedStateChangedFields: GdcpField[] = [];

    //If the rules for the new location match rules for the current location, do nothing
    if (locationRules === this.activeRules) {
      this.logger.log(
        `Rules that match the rules for "${location}" are already active. Not applying new rules.`
      );
      return {
        activeRules: this.activeRules,
        checkedStateChangedFields,
      };
    }

    this.activeRules = locationRules;

    locationRules.forEach((rule) => {
      const gdcpField = this.gdcpFields.find(
        (field) => field.channel === rule.channel
      );

      if (gdcpField) {
        const checkedStateChanged = this.applyRule(rule, gdcpField);
        if (checkedStateChanged) {
          checkedStateChangedFields.push(gdcpField);
        }
      }
    });

    return {
      activeRules: this.activeRules,
      checkedStateChangedFields,
    };
  }

  /**
   * Apply a single opt in rule to a GDCP Field.
   * If the rule is not recognized, fall back to an unselected checkbox.
   * If the field is optional, use the optional rule.
   * @return {boolean} Whether the checked state of the GDCP field has changed
   */
  private applyRule(rule: OptInRule<Channel>, gdcpField: GdcpField): boolean {
    const dataInputEl = document.querySelector(
      `input[name="${gdcpField.dataFieldName}"]`
    );
    if (!dataInputEl) {
      this.logger.log(
        `Could not find data field for "${gdcpField.channel}" - skipping rule`
      );
      return false;
    }

    let checkedStateChanged;

    const activeRule = dataInputEl
      .closest(".en__field")
      ?.classList.contains("en__mandatory")
      ? rule.rule
      : rule.optionalRule;

    switch (activeRule) {
      case "preselected_checkbox":
        checkedStateChanged = this.preselectedCheckedRule(gdcpField);
        break;
      case "checkbox":
        checkedStateChanged = this.checkboxRule(gdcpField);
        break;
      case "double_opt_in":
        checkedStateChanged = this.doubleOptInRule(gdcpField);
        break;
      case "hidden":
        checkedStateChanged = this.hiddenCheckboxRule(gdcpField);
        break;
      case "hidden_no_qcb":
        checkedStateChanged = this.hiddenNoQcbRule(gdcpField);
        break;
      default:
        this.logger.log(
          `Unknown rule "${rule.rule} - falling back to an unselected checkbox"`
        );
        checkedStateChanged = this.checkboxRule(gdcpField);
        break;
    }

    return checkedStateChanged;
  }

  setStrictMode(strictMode: boolean) {
    this.strictMode = strictMode;
  }

  /**
   * Rule for preselected checkbox
   * Check the GDCP field and all its associated opt-in fields
   * @return {boolean} Whether the checked state of the GDCP field has changed
   */
  private preselectedCheckedRule(gdcpField: GdcpField): boolean {
    this.gdcpFieldManager.setRule(
      gdcpField.gdcpFieldName,
      "preselected_checkbox"
    );
    const checkedStateChanged = this.gdcpFieldManager.setChecked(
      gdcpField.gdcpFieldName,
      true
    );
    this.gdcpFieldManager.setVisibility(gdcpField.gdcpFieldName, true);
    this.gdcpFieldManager.setDoubleOptIn(gdcpField.gdcpFieldName, false);
    return checkedStateChanged;
  }

  /**
   * Rule for checkbox
   * Uncheck the GDCP field and all its associated opt-in fields
   * @return {boolean} Whether the checked state of the GDCP field has changed
   */
  private checkboxRule(gdcpField: GdcpField): boolean {
    this.gdcpFieldManager.setRule(gdcpField.gdcpFieldName, "checkbox");
    const checkedStateChanged = this.gdcpFieldManager.setChecked(
      gdcpField.gdcpFieldName,
      false
    );
    this.gdcpFieldManager.setVisibility(gdcpField.gdcpFieldName, true);
    this.gdcpFieldManager.setDoubleOptIn(gdcpField.gdcpFieldName, false);
    return checkedStateChanged;
  }

  /**
   * Rule for hidden checkbox
   * Visually hide the GDCP field
   * Show the hidden field text
   * Check the GDCP field and all its associated opt-in fields
   * @return {boolean} Whether the checked state of the GDCP field has changed
   */
  private hiddenCheckboxRule(gdcpField: GdcpField): boolean {
    this.gdcpFieldManager.setRule(gdcpField.gdcpFieldName, "hidden");
    const checkedStateChanged = this.gdcpFieldManager.setChecked(
      gdcpField.gdcpFieldName,
      true
    );
    this.gdcpFieldManager.setVisibility(gdcpField.gdcpFieldName, false);
    this.gdcpFieldManager.setDoubleOptIn(gdcpField.gdcpFieldName, false);
    return checkedStateChanged;
  }

  /**
   * Rule for double opt-in
   * @return {boolean} Whether the checked state of the GDCP field has changed
   */
  private doubleOptInRule(gdcpField: GdcpField): boolean {
    this.gdcpFieldManager.setRule(gdcpField.gdcpFieldName, "double_opt_in");
    const checkedStateChanged = this.gdcpFieldManager.setChecked(
      gdcpField.gdcpFieldName,
      false
    );
    this.gdcpFieldManager.setVisibility(gdcpField.gdcpFieldName, true);
    this.gdcpFieldManager.setDoubleOptIn(gdcpField.gdcpFieldName, true);
    return checkedStateChanged;
  }

  /**
   * Rule for hidden field that does not generate QCB record.
   * @return {boolean} Whether the checked state of the GDCP field has changed
   */
  private hiddenNoQcbRule(gdcpField: GdcpField): boolean {
    this.gdcpFieldManager.setRule(gdcpField.gdcpFieldName, "hidden_no_qcb");
    const checkedStateChanged = this.gdcpFieldManager.setChecked(
      gdcpField.gdcpFieldName,
      true
    );
    this.gdcpFieldManager.setVisibility(gdcpField.gdcpFieldName, false);
    return checkedStateChanged;
  }
}
