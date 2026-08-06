export class PortalAcknowledgement {
  private portalAcknowledgementId: string | null = null;

  private resolvePortalAcknowledgement: (() => void) | null = null;

  waitForAcknowledgement(portalId: string): Promise<void> {
    return new Promise<void>((resolve) => {
      this.portalAcknowledgementId = portalId;
      this.resolvePortalAcknowledgement = () => {
        this.portalAcknowledgementId = null;
        this.resolvePortalAcknowledgement = null;
        resolve();
      };
    });
  }

  /** Returns true when an in-flight rollDice waiter was resumed. */
  completeAcknowledgement(portalId?: string): boolean {
    if (
      this.resolvePortalAcknowledgement &&
      (portalId === undefined ||
        this.portalAcknowledgementId === portalId)
    ) {
      this.resolvePortalAcknowledgement();
      return true;
    }

    return false;
  }
}

export const portalAcknowledgement = new PortalAcknowledgement();
