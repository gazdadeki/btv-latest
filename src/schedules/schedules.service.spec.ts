import { SchedulesService } from './schedules.service';
import { RecurrenceType, Schedule } from './entities/schedule.entity';

describe('SchedulesService', () => {
  let service: SchedulesService;

  beforeEach(() => {
    service = new SchedulesService({} as any, {} as any, {} as any, {} as any);
  });

  const baseSchedule: Partial<Schedule> = {
    recurrenceDays: [1, 3, 5],
    recurrencePattern: { month: 1, day: 15 },
  };

  it('returns true for weekly schedules on matching weekday', () => {
    const schedule = {
      ...baseSchedule,
      recurrenceType: RecurrenceType.WEEKLY,
    } as Schedule;

    const date = new Date('2026-01-12T10:00:00.000Z'); // Monday (1)
    expect(service.shouldCreateGameOnDate(schedule, date)).toBe(true);
  });

  it('returns false for weekly schedules on non-matching weekday', () => {
    const schedule = {
      ...baseSchedule,
      recurrenceType: RecurrenceType.WEEKLY,
    } as Schedule;

    const date = new Date('2026-01-13T10:00:00.000Z'); // Tuesday (2)
    expect(service.shouldCreateGameOnDate(schedule, date)).toBe(false);
  });

  it('returns true for monthly schedules on matching day', () => {
    const schedule = {
      ...baseSchedule,
      recurrenceType: RecurrenceType.MONTHLY,
      recurrenceDays: [10, 20],
    } as Schedule;

    const date = new Date('2026-01-20T10:00:00.000Z');
    expect(service.shouldCreateGameOnDate(schedule, date)).toBe(true);
  });

  it('returns true for yearly schedules on matching pattern', () => {
    const schedule = {
      ...baseSchedule,
      recurrenceType: RecurrenceType.YEARLY,
      recurrencePattern: { month: 1, day: 15 },
    } as Schedule;

    const date = new Date('2026-01-15T10:00:00.000Z');
    expect(service.shouldCreateGameOnDate(schedule, date)).toBe(true);
  });

  it('returns false for once schedules', () => {
    const schedule = {
      ...baseSchedule,
      recurrenceType: RecurrenceType.ONCE,
    } as Schedule;

    const date = new Date('2026-01-15T10:00:00.000Z');
    expect(service.shouldCreateGameOnDate(schedule, date)).toBe(false);
  });
});
