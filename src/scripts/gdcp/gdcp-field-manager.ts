import { GdcpField } from "./interfaces/gdcp-field.interface";
import { GdcpFieldState } from "./interfaces/gdcp-field-state.interface";
import { EngridLogger } from "@4site/engrid-common";
import { Rule } from "./interfaces/rule.type";

export class GdcpFieldManager {
  private fields: Map<string, GdcpFieldState> = new Map();
  private sessionItemName: string = "engrid_gdcpFieldState";
  private logger: EngridLogger = new EngridLogger(
    "GDCP",
    "#00ff00",
    "#000000",
    "🤝"
  );

  /**
   * Add a field to the field manager
   */
  addField(gdcpField: GdcpField) {
    this.fields.set(gdcpField.gdcpFieldName, {
      field: gdcpField,
      touched: false,
      checked: false,
      visible: true,
      doubleOptIn: false,
      rule: null,
    });
  }

  /**
   * Get the field state object for a given field name
   */
  getField(fieldName: string): GdcpFieldState | undefined {
    return this.fields.get(fieldName);
  }

  /**
   * Get all field state objects
   */
  getFields(): Map<string, GdcpFieldState> {
    return this.fields;
  }

  /**
   * Save the current state to session storage
   */
  saveStateToSession() {
    const state = [...this.fields.entries()];
    sessionStorage.setItem(this.sessionItemName, JSON.stringify(state));
  }

  /**
   * Apply the state from session storage to the fields
   */
  applyStateFromSession() {
    const state = sessionStorage.getItem(this.sessionItemName);
    if (state) {
      const parsedState: [string, GdcpFieldState][] = JSON.parse(state);
      this.fields = new Map(parsedState);
      this.fields.forEach((field) => {
        // Run DOM manipulation functions to match DOM to state from session
        this.updateFieldChecked(field.field.gdcpFieldName);
        this.updateFieldOptInsChecked(field.field.gdcpFieldName);
        this.updateFieldDisplay(field.field.gdcpFieldName);
      });
    }
  }

  /**
   * Clear the state from session storage
   */
  clearStateFromSession() {
    sessionStorage.removeItem(this.sessionItemName);
  }

  /**
   * Set the checked state of a field.
   * If the field has been touched, the checked state will not be changed unless the force flag is set to true.
   * If the checked state is changed, the checked state of the field and its associated opt-ins will be updated in the DOM.
   * The force flag is used when handling user-initiated changes to the checked state from the DOM.
   * @return boolean - true if the checked state was changed, false otherwise
   */
  setChecked(
    fieldName: string,
    checked: boolean,
    force: boolean = false
  ): boolean {
    const field = this.getField(fieldName);
    if (field) {
      if (field.touched && !force) {
        this.logger.log(
          `Field ${fieldName} checked state not changed as it has been touched`,
          this.fields
        );
        return false;
      }
      const checkedStateChanged = field.checked !== checked;
      field.checked = checked;
      this.updateFieldChecked(fieldName);
      this.updateFieldOptInsChecked(fieldName);
      this.logger.log(
        `Field ${field.field.channel} and opt-ins checked: ${checked}`,
        this.fields
      );
      return checkedStateChanged;
    }
    return false;
  }

  /**
   * Set the visibility of a field
   * The visibility of the field and its related hidden notice will be updated in the DOM
   */
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

  /**
   * Set the touched state of a field
   */
  setTouched(fieldName: string) {
    const field = this.getField(fieldName);
    if (field && !field.touched) {
      field.touched = true;
      this.logger.log(`Field ${fieldName} touched`, this.fields);
    }
  }

  /**
   * Set the double opt-in state of a field
   */
  setDoubleOptIn(fieldName: string, doubleOptIn: boolean) {
    const field = this.getField(fieldName);
    if (field) {
      field.doubleOptIn = doubleOptIn;
      this.logger.log(
        `Field ${fieldName} double opt-in set to: ${doubleOptIn}`,
        this.fields
      );
      // When setting a field to double opt-in, we re-call the updateFieldOptInsChecked function to ensure the opt-ins are unchecked.
      this.updateFieldOptInsChecked(fieldName);
    }
  }

  /**
   * Set the rule for a field
   */
  setRule(fieldName: string, rule: Rule) {
    const field = this.getField(fieldName);
    if (field) {
      field.rule = rule;
      this.logger.log(`Field ${fieldName} rule set to: ${rule}`, this.fields);
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
          // If the field is double opt-in, always keep the opt-in unchecked, otherwise match field state.
          input.checked = field.doubleOptIn ? false : field.checked;
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
