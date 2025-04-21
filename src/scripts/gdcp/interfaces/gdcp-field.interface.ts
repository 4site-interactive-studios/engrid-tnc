import { Channel } from "./channel.type";

export interface GdcpField {
  channel: Channel;
  dataFieldName: string;
  optInFieldNames: string[];
  gdcpFieldName: string;
  gdcpFieldHtmlLabel: string;
  gdcpFieldHtmlLabelEs: string;
}
