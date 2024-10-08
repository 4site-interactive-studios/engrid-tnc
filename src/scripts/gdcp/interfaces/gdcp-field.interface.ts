import { channel } from "./channel.type";

export interface GdcpField {
  channel: channel;
  dataFieldName: string;
  optInFieldNames: string[];
  gdcpFieldName: string;
  gdcpFieldHtmlLabel: string;
}
