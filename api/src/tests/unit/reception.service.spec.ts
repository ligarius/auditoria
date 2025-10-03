import dayjs from 'dayjs';

import { computeReceptionTimes } from '../../modules/receptions/reception.metrics.js';

describe('computeReceptionTimes', () => {
  it('calcula dwell, unload e idle correctamente', () => {
    const tArriveGate = dayjs('2024-01-01T10:00:00Z').toDate();
    const tUnloadStart = dayjs('2024-01-01T10:15:00Z').toDate();
    const tUnloadEnd = dayjs('2024-01-01T10:45:00Z').toDate();
    const tExit = dayjs('2024-01-01T11:00:00Z').toDate();
    const metrics = computeReceptionTimes({
      tArriveGate,
      tUnloadStart,
      tUnloadEnd,
      tExit
    });
    expect(metrics.dwell).toBe(60);
    expect(metrics.unload).toBe(30);
    expect(metrics.idle).toBe(30);
  });

  it('retorna null cuando faltan datos', () => {
    const metrics = computeReceptionTimes({});
    expect(metrics.dwell).toBeNull();
    expect(metrics.unload).toBeNull();
    expect(metrics.idle).toBeNull();
  });
});
