export class RiskMatrixDto {
  risks: any[];
  matrix: { [severity: string]: { [probability: string]: any[] } };
  summary: any;
}
