import { GdcpField } from "./gdcp-field.interface";
import { Rule } from "./rule.type";

export interface GdcpFieldState {
  field: GdcpField;
  touched: boolean;
  checked: boolean;
  visible: boolean;
  doubleOptIn: boolean;
  rule: Rule | null;
}
