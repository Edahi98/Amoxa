export class SignatureRenderer {
  private static readonly WIDTH = 480;

  private static readonly HEIGHT = 160;

  public static isBlank(name: string): boolean {
    return name.trim().length === 0;
  }

  public static fromText(name: string, ink: string): string | null {
    if (SignatureRenderer.isBlank(name) || typeof document === 'undefined') {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = SignatureRenderer.WIDTH;
    canvas.height = SignatureRenderer.HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.fillStyle = ink;
    context.font = 'italic 600 44px "Plus Jakarta Sans", system-ui, sans-serif';
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.fillText(name.trim(), SignatureRenderer.WIDTH / 2, SignatureRenderer.HEIGHT / 2, SignatureRenderer.WIDTH - 32);
    return canvas.toDataURL('image/png');
  }
}
