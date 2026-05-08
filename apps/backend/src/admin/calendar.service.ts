import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Schedule,
  RecurrenceType,
} from '../schedules/entities/schedule.entity';
import { Game } from '../games/entities/game.entity';
import {
  toUtcDateString,
  utcStartOfDay,
  utcEndOfDay,
} from '../common/date.utils';

/**
 * Service for generating calendar views of games.
 * Combines real games from the database with pseudo-games generated from active schedules.
 *
 * Pseudo-games are dynamically generated based on schedule recurrence patterns:
 * - WEEKLY: Games on specified days of the week
 * - MONTHLY: Games on specified days of the month
 * - YEARLY: Games on specific month/day combinations
 *
 * Real games take precedence over pseudo-games for the same schedule and time.
 */
@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  /**
   * Generates a calendar view for the specified date range.
   * Returns both real games and pseudo-games generated from active schedules.
   *
   * @param startDate - Start date for calendar range
   * @param endDate - End date for calendar range
   * @returns Calendar data with dates and associated games
   */
  async generateCalendar(startDate: Date, endDate: Date): Promise<any> {
    const startOfRange = utcStartOfDay(new Date(startDate));
    const endOfRange = utcEndOfDay(new Date(endDate));
    const endDay = utcStartOfDay(new Date(endDate));

    const [activeSchedules, realGames] = await Promise.all([
      this.scheduleRepository.find({ where: { isActive: true } }),
      this.gameRepository
        .createQueryBuilder('game')
        .leftJoinAndSelect('game.schedule', 'schedule')
        .where('game.scheduledStartTime >= :startOfRange', { startOfRange })
        .andWhere('game.scheduledStartTime <= :endOfRange', { endOfRange })
        .getMany(),
    ]);

    const scheduleMeta = activeSchedules.map((schedule) => {
      const createdDate = utcStartOfDay(new Date(schedule.createdAt));
      const [startHours, startMinutes] = schedule.firstGameStartTime
        .split(':')
        .map(Number);
      return { schedule, createdDate, startHours, startMinutes };
    });

    const gamesByDate: Map<string, any[]> = new Map();
    const dates: Date[] = [];
    const currentDate = new Date(startOfRange);
    while (currentDate <= endDay) {
      const dateKey = toUtcDateString(currentDate);
      gamesByDate.set(dateKey, []);
      dates.push(new Date(currentDate));
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    const todayKey = toUtcDateString(utcStartOfDay(new Date()));

    const realGamesByDate = new Map<
      string,
      Map<number, { games: Game[]; timeKeys: Set<string> }>
    >();

    for (const game of realGames) {
      const gameDate = new Date(game.scheduledStartTime);
      const dateKey = toUtcDateString(gameDate);

      // For past days, only show games that were actually played
      if (dateKey < todayKey && game.status !== 'FINISHED') {
        continue;
      }

      if (!realGamesByDate.has(dateKey)) {
        realGamesByDate.set(dateKey, new Map());
      }
      const scheduleMap = realGamesByDate.get(dateKey)!;
      if (!scheduleMap.has(game.scheduleId)) {
        scheduleMap.set(game.scheduleId, { games: [], timeKeys: new Set() });
      }
      const bucket = scheduleMap.get(game.scheduleId)!;
      bucket.games.push(game);
      bucket.timeKeys.add(
        `${gameDate.getUTCHours()}:${gameDate.getUTCMinutes()}`,
      );
    }

    for (const date of dates) {
      const dateKey = toUtcDateString(date);
      const scheduleMap = realGamesByDate.get(dateKey);

      if (scheduleMap) {
        for (const bucket of scheduleMap.values()) {
          bucket.games.sort(
            (a, b) =>
              new Date(a.scheduledStartTime).getTime() -
              new Date(b.scheduledStartTime).getTime(),
          );
          bucket.games.forEach((game, index) => {
            const gameWithOrder: any = {
              id: game.id,
              scheduleId: game.scheduleId,
              status: game.status,
              scheduledStartTime: game.scheduledStartTime,
              actualStartTime: game.actualStartTime,
              actualEndTime: game.actualEndTime,
              durationMinutes: game.durationMinutes,
              teamAName: game.teamAName,
              teamBName: game.teamBName,
              isExclusiveToGold: game.isExclusiveToGold,
              winningTeam: game.winningTeam,
              mvpUserId: game.mvpUserId,
              createdAt: game.createdAt,
              updatedAt: game.updatedAt,
              orderIndex: index + 1,
              scheduleName: game.schedule?.name || null,
            };
            gamesByDate.get(dateKey)!.push(gameWithOrder);
          });
        }
      }

      // Past days never offer pseudo-games — generation only makes sense for today/future.
      if (dateKey < todayKey) {
        const dayGames = gamesByDate.get(dateKey)!;
        dayGames.sort((a, b) => {
          const timeA = new Date(a.scheduledStartTime).getTime();
          const timeB = new Date(b.scheduledStartTime).getTime();
          return timeA - timeB;
        });
        continue;
      }

      for (const meta of scheduleMeta) {
        const { schedule, createdDate, startHours, startMinutes } = meta;
        if (date < createdDate) {
          continue;
        }

        if (!this.shouldCreateGameOnDate(schedule, date)) {
          continue;
        }

        const baseStartTime = new Date(date);
        baseStartTime.setUTCHours(startHours, startMinutes, 0, 0);

        for (let i = 0; i < schedule.gamesPerDay; i++) {
          // All games share the same estimated start time
          const scheduledStartTime = new Date(baseStartTime);

          const timeKey = `${scheduledStartTime.getUTCHours()}:${scheduledStartTime.getUTCMinutes()}`;
          const gameExists = scheduleMap
            ?.get(schedule.id)
            ?.timeKeys.has(timeKey);

          if (!gameExists) {
            gamesByDate.get(dateKey)!.push({
              id: `pseudo-${schedule.id}-${dateKey}-${i}`,
              scheduleId: schedule.id,
              scheduleName: schedule.name,
              scheduledStartTime,
              status: 'PSEUDO',
              teamAName: schedule.teamAName,
              teamBName: schedule.teamBName,
              isExclusiveToGold: schedule.isExclusiveToGold,
              orderIndex: i + 1,
            });
          }
        }
      }

      const dayGames = gamesByDate.get(dateKey)!;
      dayGames.sort((a, b) => {
        const timeA = new Date(a.scheduledStartTime).getTime();
        const timeB = new Date(b.scheduledStartTime).getTime();
        return timeA - timeB;
      });
    }

    const result = Array.from(gamesByDate.entries()).map(([date, games]) => ({
      date,
      games,
    }));

    return { dates: result };
  }

  /**
   * Determines if a pseudo-game should be created for a schedule on a specific date.
   * Checks recurrence pattern against the given date.
   *
   * @param schedule - The schedule to check
   * @param date - The date to check against
   * @returns True if a game should be created for this schedule on this date
   * @private
   */
  private shouldCreateGameOnDate(schedule: Schedule, date: Date): boolean {
    if (schedule.scheduleStartDate) {
      const start = new Date(schedule.scheduleStartDate + 'T00:00:00Z');
      if (date < start) return false;
    }
    if (schedule.scheduleEndDate) {
      const end = new Date(schedule.scheduleEndDate + 'T00:00:00Z');
      if (date > end) return false;
    }

    const dayOfWeek = date.getUTCDay();
    const dayOfMonth = date.getUTCDate();

    switch (schedule.recurrenceType) {
      case RecurrenceType.WEEKLY:
        return schedule.recurrenceDays?.includes(dayOfWeek) || false;
      case RecurrenceType.MONTHLY:
        return schedule.recurrenceDays?.includes(dayOfMonth) || false;
      case RecurrenceType.YEARLY:
        if (schedule.recurrencePattern) {
          return (
            date.getUTCMonth() + 1 === schedule.recurrencePattern.month &&
            date.getUTCDate() === schedule.recurrencePattern.day
          );
        }
        return false;
      case RecurrenceType.ONCE:
        if (schedule.recurrencePattern) {
          const { year, month, day } = schedule.recurrencePattern;
          const yearMatch = !year || date.getUTCFullYear() === year;
          return (
            yearMatch &&
            date.getUTCMonth() + 1 === month &&
            date.getUTCDate() === day
          );
        }
        return false;
      default:
        return false;
    }
  }
}
