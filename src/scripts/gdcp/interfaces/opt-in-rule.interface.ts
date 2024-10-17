import { Channel } from "./channel.type";
import { Rule } from "./rule.type";

// Define conditional rule logic based on the channel type
type ConditionalRule<C extends Channel> = C extends "email"
  ? Exclude<Rule, "hidden_no_qcb"> // email can't be "hidden_no_qcb"
  : C extends "postal_mail"
  ? Exclude<Rule, "double_opt_in"> // postal_mail can't be "double_opt_in"
  : Exclude<Rule, "double_opt_in" | "hidden_no_qcb">; // other channels exclude both "double_opt_in" and "hidden_no_qcb"

// Generic OptInRule interface
export interface OptInRule<C extends Channel> {
  channel: C;
  rule: ConditionalRule<C>;
  optionalRule: Rule;
}
