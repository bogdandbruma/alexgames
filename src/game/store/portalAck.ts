export class PortalAcknowledgement {
  private portalAcknowledgementId: number | null = null;

  private resolvePortalAcknowledgement: (() => void) | null = null;

  waitForAcknowledgement(portalId: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.portalAcknowledgementId = portalId;
      this.resolvePortalAcknowledgement = () => {
        this.portalAcknowledgementId = null;
        this.resolvePortalAcknowledgement = null;
        resolve();
      };
    });
  }

  completeAcknowledgement(portalId?: number): void {
    if (
      this.resolvePortalAcknowledgement &&
      (portalId === undefined ||
        this.portalAcknowledgementId === portalId)
    ) {
      this.resolvePortalAcknowledgement();
    }
  }
}

export const portalAcknowledgement = new PortalAcknowledgement();
