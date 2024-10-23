import { GeographicalRule } from "../interfaces/geographical-rule.interface";

export const geographicalOptInRules: GeographicalRule[] = [
  {
    locations: ["US", "MX", "AU"],
    rules: [
      {
        channel: "email",
        rule: "preselected_checkbox",
        optionalRule: "preselected_checkbox",
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
        optionalRule: "hidden_no_qcb",
      },
    ],
  },
  {
    locations: ["US-CO", "US-OR"],
    rules: [
      {
        channel: "email",
        rule: "checkbox",
        optionalRule: "checkbox",
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
        rule: "checkbox",
        optionalRule: "checkbox",
      },
    ],
  },
  {
    locations: ["CA"],
    rules: [
      {
        channel: "email",
        rule: "double_opt_in",
        optionalRule: "double_opt_in",
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
        rule: "checkbox",
        optionalRule: "checkbox",
      },
    ],
  },
];
