export class IHMO {
  private ihmoCheckbox: HTMLInputElement | null = document.querySelector(
    '[name="transaction.inmem"]'
  );

  constructor() {
    if (!this.shouldRun()) return;

    console.log("hello from IHMO!");
  }

  private shouldRun(): boolean {
    return !!this.ihmoCheckbox;
  }
}
