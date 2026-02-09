import React from 'react';
import LegacyPage from '@/components/LegacyPage';
import { AdminCommon } from '@/lib/adminCommon';
import { api } from '@/lib/api';

type CalendarInstance = {
  render: () => void;
  refetchEvents: () => void;
  changeView: (view: string) => void;
  today: () => void;
  prev: () => void;
  next: () => void;
};

type CalendarConstructor = new (
  element: HTMLElement,
  config: Record<string, unknown>,
) => CalendarInstance;

let calendar: CalendarInstance | null = null;
let calendarEl: HTMLElement | null = null;
let currentGameData: Record<string, unknown> | null = null;
let currentIsPseudo = false;
const expandedDates = new Set<string>();
const GAMES_PER_DAY_LIMIT = 5;

const calendarHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Calendar</h1>
          </div>
          <div class="col-sm-6">
            <div class="float-right">
              <button class="btn btn-primary" onclick="loadCalendar()">
                <i class="fas fa-sync"></i> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="content">
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-12">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Games Calendar</h3>
                <div class="card-tools">
                  <button class="btn btn-sm btn-primary" onclick="calendar.gotoToday()">
                    <i class="fas fa-calendar-day"></i> Today
                  </button>
                  <button class="btn btn-sm btn-secondary" onclick="calendar.prev()">
                    <i class="fas fa-chevron-left"></i> Prev
                  </button>
                  <button class="btn btn-sm btn-secondary" onclick="calendar.next()">
                    Next <i class="fas fa-chevron-right"></i>
                  </button>
                  <select class="form-control form-control-sm d-inline-block" id="calendarView" style="width: auto; margin-left: 10px" onchange="changeCalendarView()">
                    <option value="dayGridMonth">Month</option>
                    <option value="timeGridWeek">Week</option>
                    <option value="timeGridDay">Day</option>
                    <option value="listWeek">List</option>
                  </select>
                </div>
              </div>
              <div class="card-body">
                <div id="calendarContainer"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div class="modal fade" id="gameDetailsModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Game Details</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body" id="gameDetailsModalBody"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
          <button type="button" class="btn btn-primary" id="gameDetailsViewBtn" style="display: none" onclick="viewGameDetails()">View Game Details</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
  </footer>
`;

function getCalendarConstructor(): CalendarConstructor | null {
  const fullCalendar = window.FullCalendar as
    | { Calendar?: CalendarConstructor }
    | CalendarConstructor
    | undefined;
  if (!fullCalendar) {
    console.error('FullCalendar is not available');
    return null;
  }
  if (typeof (fullCalendar as { Calendar?: CalendarConstructor }).Calendar === 'function') {
    return (fullCalendar as { Calendar: CalendarConstructor }).Calendar;
  }
  if (typeof fullCalendar === 'function') {
    return fullCalendar as CalendarConstructor;
  }
  console.error('FullCalendar constructor not found on window.FullCalendar');
  return null;
}

function getGameStatusInfo(status: string, isPseudo: boolean) {
  if (isPseudo) {
    return {
      icon: 'fa-question-circle',
      color: '#6c757d',
      description: 'Pseudo game - not yet generated',
    };
  }

  switch (status) {
    case 'CREATED':
      return { icon: 'fa-circle', color: '#007bff', description: 'Game created and ready' };
    case 'IN_PROGRESS':
      return { icon: 'fa-play-circle', color: '#ffc107', description: 'Game in progress' };
    case 'FINISHED':
      return { icon: 'fa-check-circle', color: '#28a745', description: 'Game finished' };
    case 'CANCELLED':
      return { icon: 'fa-times-circle', color: '#dc3545', description: 'Game cancelled' };
    default:
      return { icon: 'fa-circle', color: '#6c757d', description: 'Unknown status' };
  }
}

async function showGameDetailsModal(gameData: Record<string, unknown>, isPseudo: boolean) {
  const modalBody = document.getElementById('gameDetailsModalBody');
  const viewBtn = document.getElementById('gameDetailsViewBtn');
  if (!modalBody || !viewBtn) return;

  currentGameData = gameData;
  currentIsPseudo = isPseudo;

  AdminCommon.showContainerLoader(modalBody, 'Loading game details...');

  let fullGameData = gameData;
  if (!isPseudo && gameData.id) {
    try {
      fullGameData = (await api.getGame(gameData.id as number)) as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to fetch full game details:', error);
    }
  }

  let html = '';
  if (isPseudo) {
    html = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i> This is a pseudo game (not yet generated).
      </div>
      <table class="table table-bordered">
        <tr><th width="30%">Schedule</th><td>${fullGameData.scheduleName || 'N/A'}</td></tr>
        <tr><th>Status</th><td><span class="badge badge-secondary">PSEUDO</span></td></tr>
        <tr><th>Scheduled Start Time</th><td>${AdminCommon.formatDate(fullGameData.scheduledStartTime as string)}</td></tr>
        <tr><th>Gold Exclusive</th><td>${fullGameData.isExclusiveToGold ? 'Yes' : 'No'}</td></tr>
        <tr><th>Order Index</th><td>Game ${fullGameData.orderIndex || 1}</td></tr>
      </table>
      <div class="mt-3">
        <button class="btn btn-primary" onclick="generateGameFromModal()">Generate Game</button>
      </div>
    `;
    viewBtn.style.display = 'none';
  } else {
    const statusColors: Record<string, string> = {
      CREATED: 'primary',
      IN_PROGRESS: 'warning',
      FINISHED: 'success',
      CANCELLED: 'danger',
    };
    const status = String(fullGameData.status || 'CREATED');
    const statusBadge = `<span class="badge badge-${statusColors[status] || 'secondary'}">${status}</span>`;
    const slots = (fullGameData.slots as Array<{ isReserved?: boolean }> | undefined) || [];
    const reservations =
      (fullGameData.reservations as Array<{ status?: string }> | undefined) || [];
    const totalSlots = slots.length;
    const reservedSlots = slots.filter((s) => s.isReserved).length;
    const confirmedReservations = reservations.filter((r) => r.status === 'CONFIRMED').length;
    const availableSlots = totalSlots - reservedSlots;

    html = `
      <h6>Basic Info</h6>
      <table class="table table-bordered table-sm mb-3">
        <tr><th width="30%">ID</th><td>${fullGameData.id}</td></tr>
        <tr><th>Schedule</th><td>${fullGameData.scheduleName || (fullGameData.schedule && (fullGameData.schedule as Record<string, unknown>).name) || 'N/A'}</td></tr>
        <tr><th>Status</th><td>${statusBadge}</td></tr>
        <tr><th>Scheduled Start Time</th><td>${AdminCommon.formatDate(fullGameData.scheduledStartTime as string)}</td></tr>
        <tr><th>Actual Start Time</th><td>${fullGameData.actualStartTime ? AdminCommon.formatDate(fullGameData.actualStartTime as string) : 'N/A'}</td></tr>
        <tr><th>Actual End Time</th><td>${fullGameData.actualEndTime ? AdminCommon.formatDate(fullGameData.actualEndTime as string) : 'N/A'}</td></tr>
        <tr><th>Gold Exclusive</th><td>${fullGameData.isExclusiveToGold ? 'Yes' : 'No'}</td></tr>
        <tr><th>Order Index</th><td>Game ${fullGameData.orderIndex || 1}</td></tr>
      </table>

      <h6>Slots Info</h6>
      <table class="table table-bordered table-sm mb-3">
        <tr><th width="30%">Total Slots</th><td>${totalSlots}</td></tr>
        <tr><th>Reserved Slots</th><td>${reservedSlots}</td></tr>
        <tr><th>Confirmed Reservations</th><td>${confirmedReservations}</td></tr>
        <tr><th>Available Slots</th><td>${availableSlots}</td></tr>
      </table>
    `;

    if (reservations.length > 0) {
      const statusColorsMap: Record<string, string> = {
        RESERVED: 'warning',
        CONFIRMED: 'success',
        CANCELLED: 'danger',
        EXPIRED: 'secondary',
      };
      html += `
        <h6>Reservations</h6>
        <table class="table table-bordered table-sm">
          <thead>
            <tr>
              <th>User</th>
              <th>Slot</th>
              <th>Status</th>
              <th>Reserved At</th>
              <th>Confirmed At</th>
            </tr>
          </thead>
          <tbody>
      `;
      reservations.forEach((reservation) => {
        const user = reservation.user ? (reservation.user as Record<string, unknown>).email : `User ${reservation.userId}`;
        html += `
          <tr>
            <td>${user}</td>
            <td>Slot ${(reservation.slot as Record<string, unknown>)?.slotNumber || reservation.slotId}</td>
            <td><span class="badge badge-${statusColorsMap[String(reservation.status)] || 'secondary'}">${reservation.status}</span></td>
            <td>${reservation.reservedAt ? AdminCommon.formatDate(reservation.reservedAt as string) : 'N/A'}</td>
            <td>${reservation.confirmedAt ? AdminCommon.formatDate(reservation.confirmedAt as string) : 'N/A'}</td>
          </tr>
        `;
      });
      html += `
          </tbody>
        </table>
      `;
    } else {
      html += '<p class="text-muted">No reservations</p>';
    }

    viewBtn.style.display = 'inline-block';
    viewBtn.setAttribute('data-game-id', String(fullGameData.id));
  }

  modalBody.innerHTML = html;
  AdminCommon.hideContainerLoader(modalBody);
  window.$?.('#gameDetailsModal').modal('show');
}

function initCalendarPage() {
  AdminCommon.init();

  calendarEl = document.getElementById('calendarContainer');
  const calendarContainer = calendarEl?.parentElement;

  if (!calendarEl || !calendarContainer) {
    return () => undefined;
  }

  AdminCommon.showContainerLoader(calendarContainer, 'Loading calendar...');

  const CalendarCtor = getCalendarConstructor();
  if (!CalendarCtor) return () => undefined;

  calendar = new CalendarCtor(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: false,
    height: 'auto',
    displayEventTime: false,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    loading: (isLoading: boolean) => {
      if (isLoading) {
        AdminCommon.showContainerLoader(calendarContainer, 'Loading calendar events...');
      } else {
        AdminCommon.hideContainerLoader(calendarContainer);
      }
    },
    events: async (
      fetchInfo: { startStr: string; endStr: string },
      successCallback: (events: Array<Record<string, unknown>>) => void,
      failureCallback: (error: unknown) => void,
    ) => {
      try {
        const startDate = fetchInfo.startStr.split('T')[0];
        const endDate = fetchInfo.endStr.split('T')[0];
        const data = (await api.getCalendar(startDate, endDate)) as {
          dates?: Array<{ date: string; games?: Array<Record<string, unknown>> }>;
        };

        const events: Array<Record<string, unknown>> = [];
        if (data?.dates?.length) {
          data.dates.forEach((dateEntry) => {
            if (dateEntry.games && dateEntry.games.length > 0) {
              const dateKey = dateEntry.date;
              const isExpanded = expandedDates.has(dateKey);
              const gamesToShow = isExpanded
                ? dateEntry.games
                : dateEntry.games.slice(0, GAMES_PER_DAY_LIMIT);
              const hasMore = dateEntry.games.length > GAMES_PER_DAY_LIMIT;

              gamesToShow.forEach((game) => {
                const startTime = new Date(String(game.scheduledStartTime));
                const endTime = new Date(startTime);
                endTime.setHours(endTime.getHours() + 1);

                const isPseudo = game.status === 'PSEUDO';
                const color = isPseudo
                  ? '#6c757d'
                  : game.isExclusiveToGold
                    ? '#ffc107'
                    : '#007bff';
                const statusInfo = getGameStatusInfo(String(game.status), isPseudo);
                const startTimeStr = AdminCommon.formatTime(String(game.scheduledStartTime));
                const scheduleName = String(game.scheduleName || 'Game');
                const orderIndex = Number(game.orderIndex || 1);
                const titleText = startTimeStr
                  ? `${startTimeStr} ${scheduleName} - Game ${orderIndex}`
                  : `${scheduleName} - Game ${orderIndex}`;

                events.push({
                  id: game.id || `pseudo-${game.scheduleId}-${dateKey}-${orderIndex}`,
                  title: titleText,
                  start: startTime.toISOString(),
                  end: endTime.toISOString(),
                  backgroundColor: color,
                  borderColor: color,
                  extendedProps: {
                    game,
                    isPseudo,
                    scheduleId: game.scheduleId,
                    scheduleName: game.scheduleName,
                    orderIndex,
                    status: game.status,
                    statusInfo,
                    titleText,
                  },
                });
              });

              if (hasMore) {
                const dateObj = new Date(`${dateKey}T12:00:00`);
                events.push({
                  id: `show-more-${dateKey}`,
                  title: isExpanded
                    ? `Show Less (${dateEntry.games.length - GAMES_PER_DAY_LIMIT} hidden)`
                    : `Show More (+${dateEntry.games.length - GAMES_PER_DAY_LIMIT} games)`,
                  start: dateObj.toISOString(),
                  end: dateObj.toISOString(),
                  backgroundColor: '#6c757d',
                  borderColor: '#6c757d',
                  display: 'list-item',
                  extendedProps: {
                    isShowMore: true,
                    dateKey,
                    isExpanded,
                  },
                });
              }
            }
          });
        }

        successCallback(events);
      } catch (error) {
        console.error('Failed to load calendar games:', error);
        AdminCommon.hideContainerLoader(calendarContainer);
        AdminCommon.showError(
          `Failed to load calendar: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
        failureCallback(error);
      }
    },
    eventClick: (info: { event: { extendedProps: Record<string, unknown> } }) => {
      const extendedProps = info.event.extendedProps;
      if (extendedProps.isShowMore) {
        const dateKey = String(extendedProps.dateKey);
        if (extendedProps.isExpanded) {
          expandedDates.delete(dateKey);
        } else {
          expandedDates.add(dateKey);
        }
        calendar?.refetchEvents();
        return;
      }
      const gameData = extendedProps.game as Record<string, unknown>;
      const isPseudo = Boolean(extendedProps.isPseudo);
      showGameDetailsModal(gameData, isPseudo);
    },
    dateClick: () => {
      calendar?.refetchEvents();
    },
    eventContent: (arg: {
      event: { title: string; extendedProps: Record<string, unknown> };
    }) => {
      const extendedProps = arg.event.extendedProps;
      if (extendedProps.isShowMore) {
        return { html: arg.event.title };
      }
      const statusInfo =
        (extendedProps.statusInfo as { icon?: string; color?: string; description?: string }) ||
        getGameStatusInfo(String(extendedProps.status), Boolean(extendedProps.isPseudo));
      const titleText = String(extendedProps.titleText || arg.event.title);
      let html = '';
      if (statusInfo?.icon) {
        html += `<i class="fas ${statusInfo.icon}" style="color: ${statusInfo.color}; margin-right: 4px;" title="${statusInfo.description || ''}"></i>`;
      }
      html += titleText;
      return { html };
    },
    eventDidMount: (info: {
      event: { extendedProps: Record<string, unknown> };
      el: HTMLElement;
    }) => {
      if (info.event.extendedProps.isShowMore) return;
      const gameData = info.event.extendedProps.game as Record<string, unknown>;
      if (gameData) {
        const isPseudo = Boolean(info.event.extendedProps.isPseudo);
        const status = String(gameData.status || 'CREATED');
        const statusInfo = getGameStatusInfo(status, isPseudo);
        const statusText = isPseudo ? 'Pseudo Game (Not Generated)' : `Status: ${status}`;
        const goldText = gameData.isExclusiveToGold ? ' | Gold Only' : '';
        const startTimeStr = AdminCommon.formatTime(String(gameData.scheduledStartTime));
        const timeText = startTimeStr ? `Time: ${startTimeStr}` : '';
        let tooltip = `${statusText}${goldText}`;
        if (timeText) tooltip += `\n${timeText}`;
        tooltip += `\n${gameData.teamAName} vs ${gameData.teamBName}`;
        if (statusInfo.description) tooltip += `\n${statusInfo.description}`;
        info.el.setAttribute('title', tooltip);
      }
    },
  });

  calendar.render();
  const viewSelect = document.getElementById('calendarView') as HTMLSelectElement | null;
  if (viewSelect) {
    viewSelect.value = 'dayGridMonth';
  }

  window.calendar = {
    gotoToday: () => calendar?.today(),
    prev: () => calendar?.prev(),
    next: () => calendar?.next(),
  };
  window.changeCalendarView = () => {
    const view = (document.getElementById('calendarView') as HTMLSelectElement | null)
      ?.value;
    if (view) {
      calendar?.changeView(view);
    }
  };
  window.loadCalendar = () => {
    calendar?.refetchEvents();
  };
  window.viewGameDetails = () => {
    const gameId = document
      .getElementById('gameDetailsViewBtn')
      ?.getAttribute('data-game-id');
    if (gameId) {
      window.location.href = `/admin/games?gameId=${gameId}`;
    }
  };
  window.generateGameFromModal = async () => {
    if (!currentGameData || !currentIsPseudo) return;
    const scheduleId = currentGameData.scheduleId as number;
    const startTime = String(currentGameData.scheduledStartTime);
    const dateStr = new Date(startTime).toISOString().split('T')[0];
    window.$?.('#gameDetailsModal').modal('hide');
    try {
      AdminCommon.showFullScreenLoader('Generating games...');
      await api.generateGamesForSchedule(scheduleId, dateStr);
      AdminCommon.showSuccess('Games generated successfully');
      calendar?.refetchEvents();
    } catch (error) {
      AdminCommon.showError(
        `Failed to generate games: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      AdminCommon.hideFullScreenLoader();
    }
  };

  return () => {
    if (calendar && typeof (calendar as { destroy?: () => void }).destroy === 'function') {
      (calendar as { destroy: () => void }).destroy();
    }
    calendar = null;
    calendarEl = null;
    currentGameData = null;
    currentIsPseudo = false;
    expandedDates.clear();
    delete (window as { calendar?: unknown }).calendar;
    delete (window as { changeCalendarView?: () => void }).changeCalendarView;
    delete (window as { loadCalendar?: () => void }).loadCalendar;
    delete (window as { viewGameDetails?: () => void }).viewGameDetails;
    delete (window as { generateGameFromModal?: () => void }).generateGameFromModal;
  };
}

export default function CalendarPage() {
  return <LegacyPage html={calendarHtml} onMount={initCalendarPage} />;
}
