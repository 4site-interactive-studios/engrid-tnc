import { OptInRule } from "../interfaces/opt-in-rule.interface";

//Strict Opt-In Rules
//These rules are used FOR ALL LOCATIONS when the page is manually set to strict opt-in mode
export const strictOptInRules: OptInRule[] = [
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
    rule: "checkbox",
    optionalRule: "checkbox",
  },
];
