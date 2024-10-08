import { channel } from "./channel.type";

export interface OptInRule {
  channel: channel;
  rule:
    | "preselected_checkbox"
    | "checkbox"
    | "hidden"
    | "double_opt_in"
    | "hidden_no_qcb";
  optionalRule:
    | "preselected_checkbox"
    | "checkbox"
    | "hidden"
    | "double_opt_in"
    | "hidden_no_qcb";
}
