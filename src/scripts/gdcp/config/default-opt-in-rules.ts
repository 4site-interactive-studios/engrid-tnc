import { OptInRule } from "../interfaces/opt-in-rule.interface";

//Default opt-in rules for the GDCP
//These rules are used when the user's location does not have specific rules
export const defaultOptInRules: [
  OptInRule<"email">,
  OptInRule<"mobile_phone">,
  OptInRule<"home_phone">,
  OptInRule<"postal_mail">
] = [
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
    rule: "checkbox",
    optionalRule: "checkbox",
  },
];
