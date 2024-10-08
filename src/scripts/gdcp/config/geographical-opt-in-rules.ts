import { OptInRule } from "../interfaces/opt-in-rule.interface";

export const geographicalOptInRules: Record<string, OptInRule[]> = {
  US: [
    {
      channel: "email",
      rule: "preselected_checkbox",
      optionalRule: "hidden",
    },
    {
      channel: "mobile_phone",
      rule: "preselected_checkbox",
      optionalRule: "hidden",
    },
    {
      channel: "home_phone",
      rule: "preselected_checkbox",
      optionalRule: "hidden",
    },
    {
      channel: "postal_mail",
      rule: "hidden_no_qcb",
      optionalRule: "hidden",
    },
  ],
  CA: [
    {
      channel: "email",
      rule: "double_opt_in",
      optionalRule: "hidden",
    },
    {
      channel: "mobile_phone",
      rule: "checkbox",
      optionalRule: "hidden",
    },
    {
      channel: "home_phone",
      rule: "checkbox",
      optionalRule: "hidden",
    },
    {
      channel: "postal_mail",
      rule: "hidden_no_qcb",
      optionalRule: "hidden",
    },
  ],
  // Default rules for all other countries "ROW (Rest of the World)"
  default: [
    {
      channel: "email",
      rule: "checkbox",
      optionalRule: "hidden",
    },
    {
      channel: "mobile_phone",
      rule: "checkbox",
      optionalRule: "hidden",
    },
    {
      channel: "home_phone",
      rule: "checkbox",
      optionalRule: "hidden",
    },
    {
      channel: "postal_mail",
      rule: "hidden_no_qcb",
      optionalRule: "hidden",
    },
  ],
  // Strict mode rules - use for all locations when strict mode is enabled via code block
  strict: [
    {
      channel: "email",
      rule: "checkbox",
      optionalRule: "checkbox",
    },
    {
      channel: "mobile_phone",
      rule: "checkbox",
      optionalRule: "checkbox",
    },
    {
      channel: "home_phone",
      rule: "checkbox",
      optionalRule: "checkbox",
    },
    {
      channel: "postal_mail",
      rule: "hidden_no_qcb",
      optionalRule: "checkbox",
    },
  ],
};
