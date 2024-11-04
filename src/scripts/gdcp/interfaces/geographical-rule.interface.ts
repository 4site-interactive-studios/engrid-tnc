import { OptInRule } from "./opt-in-rule.interface";

export type GeographicalRule = {
  locations: string[];
  rules: [
    OptInRule<"email">,
    OptInRule<"mobile_phone">,
    OptInRule<"home_phone">,
    OptInRule<"postal_mail">
  ];
};
