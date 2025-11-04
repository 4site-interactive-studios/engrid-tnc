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
  private oldToNewMap: Map<string, WorkdayPair> = new Map(
    this.mappings.map((pair) => [this.getMapKey(pair.old), pair.new])
  );
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
   * Get the unique composite key for a WorkdayPair
   */
  private getMapKey(pair: WorkdayPair): string {
    return `${pair.revenueCategory?.toLowerCase()}||${pair.applicationOther?.toLowerCase()}`;
  }

  /**
   * Set new field values based on the mapping
   */
  private setNewFieldValues(): void {
    if (!this.revenueCategoryField || !this.applicationOtherField) {
      return;
    }

    const key = this.getMapKey({
      revenueCategory: this.revenueCategoryField.value,
      applicationOther: this.applicationOtherField.value,
    });

    this.logger.log(
      `Looking for new mapping for Revenue Category: "${this.revenueCategoryField.value}", Application Other: "${this.applicationOtherField.value}", key: "${key}"`
    );

    const newValues = this.oldToNewMap.get(key);

    if (!newValues) {
      this.logger.log(`No updated mapping found. Not updating fields.`);
      return;
    }

    this.revenueCategoryField.value = newValues.revenueCategory;
    this.applicationOtherField.value = newValues.applicationOther;

    this.logger.log(
      `Mapped to new values - Revenue Category: "${this.revenueCategoryField.value}", Application Other: "${this.applicationOtherField.value}"`
    );
  }
}
