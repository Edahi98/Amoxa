export class ApiDownload {
  public readonly blob: Blob;
  public readonly fileName: string;

  constructor(blob: Blob, fileName: string) {
    this.blob = blob;
    this.fileName = fileName;
  }
}
