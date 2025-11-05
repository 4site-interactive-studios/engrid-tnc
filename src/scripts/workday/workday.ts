/*
 * This module maps old values of the Revenue Category and Application Other fields
 * into new values for the Workday system.
 */
import { WorkdayMapping, WorkdayPair } from "./workday.types";
import { workdayMappings } from "./workday-mappings";
import { ENGrid, EngridLogger } from "@4site/engrid-scripts";

export class Workday {
  private logger: EngridLogger = new EngridLogger(
    "Workday",
    "white",
    "blue",
    "💼"
  );
  private mappings: WorkdayMapping[] = workdayMappings;
  private revenueCategoryField: HTMLInputElement | null = ENGrid.getField(
    "transaction.othamt4"
  ) as HTMLInputElement;
  private applicationOtherField: HTMLInputElement | null = ENGrid.getField(
    "transaction.othamt1"
  ) as HTMLInputElement;

  constructor() {
    if (!this.shouldRun()) {
      return;
    }
    this.logger.log("Running Workday field mapping");
    this.setNewFieldValues();
  }

  /*
   * Run when conditions are met:
   *  - Both Revenue Category and Application Other fields are present
   */
  private shouldRun(): boolean {
    return !!this.revenueCategoryField && !!this.applicationOtherField;
  }

  /**
   * Get new values based on the old pair (or false)
   */
  private getNewValues(pair: WorkdayPair): WorkdayPair | false {
    return (
      this.mappings.find(
        (m) =>
          m.old.revenueCategory.toLowerCase() ===
            pair.revenueCategory.toLowerCase() &&
          m.old.applicationOther.toLowerCase() ===
            pair.applicationOther.toLowerCase()
      )?.new || false
    );
  }

  /**
   * Set new field values based on the mapping
   */
  private setNewFieldValues(): void {
    if (!this.revenueCategoryField || !this.applicationOtherField) {
      return;
    }

    this.logger.log(
      `Looking for new mapping for Revenue Category: "${this.revenueCategoryField.value}", Application Other: "${this.applicationOtherField.value}"`
    );

    const newValues = this.getNewValues({
      revenueCategory: this.revenueCategoryField.value,
      applicationOther: this.applicationOtherField.value,
    });

    if (!newValues) {
      this.logger.log(`No updated mapping found. Not updating fields.`);
      return;
    }

    this.logger.log(
      `Mapping to new values - Revenue Category: "${newValues.revenueCategory}", Application Other: "${newValues.applicationOther}"`
    );

    this.setFieldValue(this.revenueCategoryField, newValues.revenueCategory);
    this.setFieldValue(this.applicationOtherField, newValues.applicationOther);
  }

  /**
   * Set field value, adding option if needed (for select fields)
   */
  private setFieldValue(field: HTMLInputElement, value: string): void {
    if (field instanceof HTMLSelectElement) {
      let option = [...field.options].find((opt) => opt.value === value);

      if (!option) {
        option = new Option(value, value);
        field.add(option);
      }

      field.value = value;
      return;
    }

    field.value = value;
  }
}
