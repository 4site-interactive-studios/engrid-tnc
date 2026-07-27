import { ENGrid } from "@4site/engrid-scripts";

export class GenerateEmail {
  private generateEmailButton: HTMLElement | null;
  constructor() {
    this.generateEmailButton = document.querySelector('#generateEmail');
    if (this.generateEmailButton && ENGrid.getField('supporter.emailAddress')) {
      this.addListener();
    }
  }

  private addListener(): void {
    this.generateEmailButton!.addEventListener('click', () => this.generateEmail());
  }

  private generateEmail(): void {
    const theDate = new Date()
    const milliseconds = theDate.getTime()
    const anonAddress = `${milliseconds}.first.last@fakeemail.com`
    ENGrid.setFieldValue('supporter.emailAddress', anonAddress);
  }
}