import { scoringService } from '../../services/scoring.js';

describe('scoringService.calculate', () => {
  it('returns null total when there is no scoring config', () => {
    const result = scoringService.calculate({ answer: 'Sí' });
    expect(result.total).toBeNull();
    expect(result.details).toHaveLength(0);
  });

  it('sums weights for matching rules', () => {
    const config = {
      baseScore: 5,
      rules: [
        { id: 'r1', questionId: 'q1', operator: 'eq', value: 'sí', weight: 3 },
        { id: 'r2', questionId: 'q2', operator: 'gt', value: 10, weight: 2 }
      ]
    };

    const result = scoringService.calculate({ q1: 'sí', q2: 15 }, config);

    expect(result.total).toBe(10);
    expect(result.details).toHaveLength(2);
    expect(result.details[0]).toMatchObject({
      ruleId: 'r1',
      matched: true,
      contribution: 3
    });
    expect(result.details[1]).toMatchObject({
      ruleId: 'r2',
      matched: true,
      contribution: 2
    });
  });

  it('ignores rules that do not match', () => {
    const config = {
      rules: [
        { id: 'r1', questionId: 'q1', operator: 'eq', value: 'Sí', weight: 5 },
        {
          id: 'r2',
          questionId: 'q2',
          operator: 'includes',
          value: 'urgente',
          weight: 2
        }
      ]
    };

    const result = scoringService.calculate(
      { q1: 'No', q2: ['medio'] },
      config
    );

    expect(result.total).toBe(0);
    expect(result.details).toEqual([
      { ruleId: 'r1', matched: false, weight: 5, contribution: 0 },
      { ruleId: 'r2', matched: false, weight: 2, contribution: 0 }
    ]);
  });

  it('returns null total when config cannot be parsed', () => {
    const result = scoringService.calculate({ q1: 'Sí' }, { invalid: true });
    expect(result.total).toBeNull();
    expect(result.details).toHaveLength(0);
  });
});
