import dayjs from 'dayjs';

export interface ReceptionTimesInput {
  tArriveGate?: Date | null;
  tUnloadStart?: Date | null;
  tUnloadEnd?: Date | null;
  tExit?: Date | null;
}

export const computeReceptionTimes = (reception: ReceptionTimesInput) => {
  const dwell = reception.tArriveGate && reception.tExit ? dayjs(reception.tExit).diff(dayjs(reception.tArriveGate), 'minute') : null;
  const unload = reception.tUnloadStart && reception.tUnloadEnd ? dayjs(reception.tUnloadEnd).diff(dayjs(reception.tUnloadStart), 'minute') : null;
  const idle = dwell !== null && unload !== null ? dwell - unload : null;
  return { dwell, unload, idle };
};
