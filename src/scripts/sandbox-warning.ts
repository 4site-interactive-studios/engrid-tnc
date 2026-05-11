export class SandboxWarning {
  constructor() {
    if (this.shouldRun()) {
      this.displayWarning();
    }
  }

  private shouldRun(): boolean {
    return (
      window.EngagingNetworks.vault.environment === 'sandbox'
    );
  }

  private displayWarning(): void {
    const warning = document.createElement('div');
    warning.className = 'sandbox-warning';

    const message = document.createElement('span');
    message.textContent =
      'This page is in the SANDBOX environment. Please switch gateways for live transactions.';

    warning.appendChild(message);
    document.body.appendChild(warning);
  }
}