export interface RiskInput {
  probability: number;
  impact: number;
}

export const computeRiskValues = ({ probability, impact }: RiskInput) => {
  const severity = probability * impact;
  let rag = 'Verde';
  if (severity >= 15) rag = 'Rojo';
  else if (severity >= 8) rag = 'Ámbar';
  return { severity, rag };
};
