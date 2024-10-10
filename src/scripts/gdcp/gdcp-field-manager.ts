import { GdcpField } from "./interfaces/gdcp-field.interface";
import { GdcpFieldState } from "./interfaces/gdcp-field-state.interface";
import { EngridLogger } from "@4site/engrid-common";

export class GdcpFieldManager {
  private fields: Map<string, GdcpFieldState> = new Map();
  private logger: EngridLogger = new EngridLogger(
    "GDCP",
    "#00ff00",
    "#000000",
    "🤝"
  );

  getField(fieldName: string): GdcpFieldState | undefined {
    return this.fields.get(fieldName);
  }

  addField(gdcpField: GdcpField) {
    this.fields.set(gdcpField.gdcpFieldName, {
      field: gdcpField,
      touched: false,
      checked: false,
      visible: true,
    });
  }

  setChecked(fieldName: string, checked: boolean) {
    const field = this.getField(fieldName);
    if (field) {
      field.checked = checked;
      this.updateFieldChecked(fieldName);
      this.updateFieldOptInsChecked(fieldName);
      this.logger.log(
        `Field ${field.field.channel} and opt-ins checked: ${checked}`,
        this.fields
      );
    }
  }

  setVisibility(fieldName: string, visible: boolean) {
    const field = this.getField(fieldName);
    if (field) {
      field.visible = visible;
      this.updateFieldDisplay(fieldName);
      this.logger.log(
        `Field ${fieldName} visibility set to: ${visible}`,
        this.fields
      );
    }
  }

  setTouched(fieldName: string) {
    const field = this.getField(fieldName);
    if (field) {
      field.touched = true;
      this.logger.log(`Field ${fieldName} touched`, this.fields);
    }
  }

  /**
   * Update the checked state of the field in the DOM
   */
  private updateFieldChecked(fieldName: string) {
    const field = this.getField(fieldName);
    if (field) {
      const input = document.querySelector(
        `input[name="${field.field.gdcpFieldName}"]`
      ) as HTMLInputElement;
      if (input) {
        input.checked = field.checked;
      }
    }
  }

  /**
   * Update the checked state of the opt in fields associated with the field in the DOM
   */
  private updateFieldOptInsChecked(fieldName: string) {
    const field = this.getField(fieldName);
    if (field) {
      field.field.optInFieldNames.forEach((name) => {
        const input = document.querySelector(
          `[name="${name}"]`
        ) as HTMLInputElement;
        if (input) {
          input.checked = field.checked;
        }
      });
    }
  }

  /**
   * Update the visibility of the field
   * Show/hide the field and its related hidden notice in the DOM
   */
  private updateFieldDisplay(fieldName: string) {
    const field = this.getField(fieldName);
    if (field) {
      const input = document.querySelector(
        `input[name="${field.field.gdcpFieldName}"]`
      ) as HTMLInputElement;
      if (input) {
        const wrapper = input.closest(".en__field__item") as HTMLElement;
        if (wrapper) {
          wrapper.classList.toggle("hide", !field.visible);
        }
        const notice = document.querySelector(
          `.${field.field.channel}-description`
        ) as HTMLElement;
        if (notice) {
          notice.classList.toggle("hide", field.visible);
        }
      }
    }
  }
}
