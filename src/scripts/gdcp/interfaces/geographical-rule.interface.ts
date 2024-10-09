import { OptInRule } from "./opt-in-rule.interface";

export type GeographicalRule = {
  locations: string[];
  rules: OptInRule[];
};
