export class SandboxWarning {
  private static readonly COOKIE_NAME = 'sandbox_warning_dismissed';

  constructor() {
    if (this.shouldRun()) {
      this.displayWarning();
    }
  }

  private shouldRun(): boolean {
    return (
      window.EngagingNetworks.vault.environment === 'sandbox' &&
      !this.isDismissed()
    );
  }

  private isDismissed(): boolean {
    return document.cookie
      .split(';')
      .some((c) => c.trim().startsWith(`${SandboxWarning.COOKIE_NAME}=`));
  }

  private dismiss(): void {
    const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${SandboxWarning.COOKIE_NAME}=1; expires=${expires}; path=/; SameSite=Strict`;
  }

  private displayWarning(): void {
    const warning = document.createElement('div');
    warning.className = 'sandbox-warning';

    const message = document.createElement('span');
    message.textContent =
      'This page is in the SANDBOX environment. Please switch gateways for live transactions.';

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'sandbox-warning__dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => {
      this.dismiss();
      warning.remove();
    });

    warning.appendChild(message);
    warning.appendChild(dismissBtn);
    document.body.appendChild(warning);
  }
}