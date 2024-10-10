import { GdcpField } from "./gdcp-field.interface";

export interface GdcpFieldState {
  field: GdcpField;
  touched: boolean;
  checked: boolean;
  visible: boolean;
}
