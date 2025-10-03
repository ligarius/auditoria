import { computeRiskValues } from '../../modules/risks/risk.utils.js';

describe('computeRisk', () => {
  it('marca rojo cuando severidad >= 15', () => {
    const result = computeRiskValues({ probability: 5, impact: 3 });
    expect(result.severity).toBe(15);
    expect(result.rag).toBe('Rojo');
  });

  it('marca ámbar cuando severidad entre 8 y 14', () => {
    const result = computeRiskValues({ probability: 4, impact: 2 });
    expect(result.severity).toBe(8);
    expect(result.rag).toBe('Ámbar');
  });

  it('marca verde en severidad baja', () => {
    const result = computeRiskValues({ probability: 2, impact: 3 });
    expect(result.severity).toBe(6);
    expect(result.rag).toBe('Verde');
  });
});
