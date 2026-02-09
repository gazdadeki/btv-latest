import React from 'react';
import LegacyPage from '@/components/LegacyPage';
import { api } from '@/lib/api';
import { AdminCommon } from '@/lib/adminCommon';
import { AuthUtils } from '@/lib/auth';
import { webSocketManager } from '@/lib/websocketManager';

const schedulesHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Schedules</h1>
          </div>
          <div class="col-sm-6">
            <button class="btn btn-primary float-right" onclick="showCreateScheduleModal()">
              <i class="fas fa-plus"></i> New Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
    <section class="content">
      <div class="container-fluid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Schedules</h3>
            <div class="card-tools">
              <div class="btn-group mr-2">
                <select class="form-control form-control-sm" id="scheduleFilter" onchange="applyScheduleFilter()">
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="all">All Schedules</option>
                </select>
              </div>
            </div>
          </div>
          <div class="card-body">
            <table id="schedulesTable" class="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Active</th>
                  <th>Slots/Games</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="7" class="text-center">Loading...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div class="modal fade" id="scheduleModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-xl" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Create Schedule</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <ul class="nav nav-pills nav-justified mb-3">
            <li class="nav-item">
              <a class="nav-link step-indicator active" href="#" onclick="return false;">
                <span class="badge badge-primary">1</span> Schedule Config
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link step-indicator" href="#" onclick="return false;">
                <span class="badge badge-secondary">2</span> Recurrence
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link step-indicator" href="#" onclick="return false;">
                <span class="badge badge-secondary">3</span> Slots
              </a>
            </li>
          </ul>

          <form id="scheduleForm">
            <div id="step1" class="schedule-step">
              <input type="hidden" class="form-control" id="teamAName" value="Scourge" required />
              <input type="hidden" class="form-control" id="teamBName" value="Sentinel" required />
              <div class="row">
                <div class="col-md-8">
                  <div class="form-group">
                    <label>Schedule Name (optional - will auto-generate if empty)</label>
                    <input type="text" class="form-control" id="scheduleName" />
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="form-group">
                    <label>First Game Start Time *</label>
                    <input type="time" class="form-control" id="firstGameStartTime" value="09:00" required />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-12">
                  <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="scheduleDescription" rows="2"></textarea>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Games Per Day *</label>
                    <input type="number" class="form-control" id="gamesPerDay" value="1" min="1" required />
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Spacing After Finish (minutes)</label>
                    <input type="number" class="form-control" id="spacingAfterFinishMinutes" min="0" />
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Confirmation Window (minutes) *</label>
                    <input type="number" class="form-control" id="confirmationWindowMinutes" value="30" min="0" required />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Reservation Cost (coins) *</label>
                    <input type="number" class="form-control" id="reservationCost" value="0" step="1" min="0" required />
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Instant Reservation Cost (coins, optional)</label>
                    <input type="number" class="form-control" id="instantReservationCost" step="0.01" min="0" placeholder="Leave empty or 0 to disable" />
                    <small class="form-text text-muted">If set and > 0, allows users to instantly reserve and confirm in one step</small>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Slots Per Game *</label>
                    <input type="number" class="form-control" id="slotsPerGame" value="10" min="2" step="2" required />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-8">
                  <div class="form-group">
                    <label>Refund Policy *</label>
                    <select class="form-control" id="refundPolicy" required>
                      <option value="NONE">None</option>
                      <option value="FULL">Full</option>
                      <option value="PARTIAL">Partial</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Refund Percentage (if Partial)</label>
                    <input type="number" class="form-control" id="refundPercentage" min="0" max="100" value="0" />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label>Schedule URL (for notifications)</label>
                    <input type="url" class="form-control" id="scheduleUrl" placeholder="https://youtube.com" value="https://youtube.com" />
                    <small class="form-text text-muted">URL to include in schedule-related notifications</small>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label>Reminder Minutes Before (comma-separated)</label>
                    <input type="text" class="form-control" id="reminderMinutesBefore" placeholder="60, 30, 15" />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-12">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="isExclusiveToGold" />
                    <label class="form-check-label">Exclusive to Gold Subscribers</label>
                  </div>
                </div>
              </div>
            </div>

            <div id="step2" class="schedule-step" style="display: none">
              <div class="form-group">
                <label>Recurrence Type *</label>
                <select class="form-control" id="recurrenceType" required>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="ONCE">Once</option>
                </select>
              </div>

              <div id="weeklyOptions">
                <label>Days of Week *</label>
                <div id="weeklyDays" class="form-group">
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="day0" value="0" />
                    <label class="form-check-label" for="day0">Sunday</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="day1" value="1" />
                    <label class="form-check-label" for="day1">Monday</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="day2" value="2" />
                    <label class="form-check-label" for="day2">Tuesday</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="day3" value="3" />
                    <label class="form-check-label" for="day3">Wednesday</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="day4" value="4" />
                    <label class="form-check-label" for="day4">Thursday</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="day5" value="5" />
                    <label class="form-check-label" for="day5">Friday</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="day6" value="6" />
                    <label class="form-check-label" for="day6">Saturday</label>
                  </div>
                </div>
              </div>

              <div id="monthlyOptions" style="display: none">
                <div class="form-group">
                  <label>Days of Month (comma-separated, 1-31) *</label>
                  <input type="text" class="form-control" id="monthlyDays" placeholder="1, 15, 30" />
                </div>
              </div>

              <div id="yearlyOptions" style="display: none">
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label>Month *</label>
                      <select class="form-control" id="yearlyMonth">
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label>Day *</label>
                      <input type="number" class="form-control" id="yearlyDay" min="1" max="31" value="1" />
                    </div>
                  </div>
                </div>
              </div>

              <div id="onceOptions" style="display: none">
                <div class="form-group">
                  <label>Date *</label>
                  <input type="date" class="form-control" id="onceDate" />
                </div>
              </div>

              <div class="alert alert-info mt-3">
                <strong>Preview:</strong>
                <span id="eventsPreview">0 games will be created in the next 30 days</span>
              </div>
            </div>

            <div id="step3" class="schedule-step" style="display: none">
              <div class="row">
                <div class="col-md-6">
                  <h5>Scourge</h5>
                  <div id="teamASlots"></div>
                </div>
                <div class="col-md-6">
                  <h5>Sentinel</h5>
                  <div id="teamBSlots"></div>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-secondary" id="scheduleModalPrev" style="display: none">Previous</button>
          <button type="button" class="btn btn-primary" id="scheduleModalNext">Next</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="generateEventsModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Generate Games</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="generateEventsScheduleId" />
          <div class="form-group">
            <label>Date *</label>
            <input type="date" class="form-control" id="generateEventsDate" required />
          </div>
          <div class="alert alert-warning">
            This will cancel all dangling games for this schedule and generate new games for the selected date.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="generateEvents()">Generate Games</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="scheduleDetailsModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-xl" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Schedule Details</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="scheduleDetailsId" />
          <div id="scheduleDetailsEditMode" style="display: none">
            <div class="alert alert-info">
              <i class="fas fa-info-circle"></i> Edit mode enabled. Make changes and click Save.
            </div>
            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="scheduleDetailsPropagateNow" />
              <label class="form-check-label">
                <strong>Propagate Changes Now</strong> - Cancel all CREATED games for this schedule and regenerate
              </label>
            </div>
          </div>
          <ul class="nav nav-tabs" id="scheduleDetailsTabs" role="tablist">
            <li class="nav-item">
              <a class="nav-link active" id="overview-tab" data-toggle="tab" href="#scheduleOverview" role="tab">Overview</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="recurrence-tab" data-toggle="tab" href="#scheduleRecurrence" role="tab">Recurrence</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="slots-tab" data-toggle="tab" href="#scheduleSlots" role="tab">Slots</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="events-tab" data-toggle="tab" href="#scheduleEvents" role="tab">Games</a>
            </li>
          </ul>
          <div class="tab-content mt-3" id="scheduleDetailsTabContent">
            <div class="tab-pane fade show active" id="scheduleOverview" role="tabpanel">
              <div id="scheduleOverviewContent"></div>
            </div>
            <div class="tab-pane fade" id="scheduleRecurrence" role="tabpanel">
              <div id="scheduleRecurrenceContent"></div>
            </div>
            <div class="tab-pane fade" id="scheduleSlots" role="tabpanel">
              <div id="scheduleSlotsContent"></div>
            </div>
            <div class="tab-pane fade" id="scheduleEvents" role="tabpanel">
              <div id="scheduleEventsContent"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
          <button type="button" class="btn btn-warning" id="scheduleDetailsEditBtn" onclick="enableScheduleEdit()">Edit</button>
          <button type="button" class="btn btn-primary" id="scheduleDetailsSaveBtn" style="display: none" onclick="saveScheduleChanges()">Save Changes</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
  </footer>
`;

function initSchedulesPage() {
  let schedulesTable: { destroy: () => void } | null = null;
  let currentStep = 1;
  let scheduleData: Record<string, unknown> = {};
  let allUsers: Array<Record<string, unknown>> = [];
  let currentEditingSchedule: Record<string, unknown> | null = null;
  const globalWindow = window as unknown as Record<string, unknown>;

  AdminCommon.init();

  const savedFilter = localStorage.getItem('schedulesFilter');
  if (savedFilter) {
    const filterEl = document.getElementById('scheduleFilter') as HTMLSelectElement | null;
    if (filterEl) filterEl.value = savedFilter;
  }

  const cleanupWebSocket = initializeWebSocket();
  loadSchedules();
  loadUsers();
  setupModals();

  function getTeamDisplayName(teamCode: string) {
    if (teamCode === 'A') return 'Scourge';
    if (teamCode === 'B') return 'Sentinel';
    return teamCode;
  }

  function initializeWebSocket() {
    const unsubscribers = [
      webSocketManager.on('schedule:created', () => loadSchedules()),
      webSocketManager.on('schedule:updated', () => loadSchedules()),
      webSocketManager.on('schedule:deleted', () => loadSchedules()),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }

  async function loadUsers() {
    try {
      const users = (await api.getUsers()) as Array<Record<string, unknown>>;
      allUsers = users || [];
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  async function loadSchedules() {
    const tableContainer =
      document.querySelector('.card-body') ||
      document.querySelector('#schedulesTable')?.parentElement;
    try {
      if (tableContainer) {
        AdminCommon.showContainerLoader(tableContainer, 'Loading schedules...');
      }

      let schedules = (await api.getSchedules()) as Array<Record<string, unknown>>;
      const filterValue = (document.getElementById('scheduleFilter') as HTMLSelectElement | null)
        ?.value;
      if (filterValue === 'active') {
        schedules = schedules.filter((s) => s.isActive);
      } else if (filterValue === 'inactive') {
        schedules = schedules.filter((s) => !s.isActive);
      }

      const tbody = document.querySelector('#schedulesTable tbody');

      if (schedulesTable) {
        schedulesTable.destroy();
        schedulesTable = null;
      }

      if (tbody && schedules && schedules.length > 0) {
        tbody.innerHTML = schedules
          .map(
            (s) => `
          <tr>
            <td>${s.id}</td>
            <td>${s.name}</td>
            <td><span class="badge badge-info">${s.recurrenceType}</span></td>
            <td>${s.isActive ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-secondary">No</span>'}</td>
            <td>${s.slotsPerGame}</td>
            <td>${AdminCommon.formatDateOnly(String(s.createdAt || ''))}</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="viewSchedule(${s.id})" title="View"><i class="fas fa-eye"></i></button>
              <button class="btn btn-sm btn-warning" onclick="editSchedule(${s.id})" title="Edit"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-success" onclick="showGenerateGamesModal(${s.id})" title="Generate Games"><i class="fas fa-calendar-plus"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteSchedule(${s.id}, this)" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `,
          )
          .join('');
        schedulesTable = AdminCommon.initDataTable(
          '#schedulesTable',
          {},
          'schedulesTable',
        );
      } else if (tbody) {
        tbody.innerHTML = '';
        schedulesTable = AdminCommon.initDataTable(
          '#schedulesTable',
          {
            language: {
              emptyTable: 'No schedules found',
            },
          },
          'schedulesTable',
        );
      }

      if (tableContainer) {
        AdminCommon.hideContainerLoader(tableContainer);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
      if (tableContainer) {
        AdminCommon.hideContainerLoader(tableContainer);
      }
      const tbody = document.querySelector('#schedulesTable tbody');
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="text-center text-danger">Failed to load schedules</td></tr>';
      }
      AdminCommon.showError(
        `Failed to load schedules: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  function setupModals() {
    const scheduleModalPrev = document.getElementById('scheduleModalPrev');
    scheduleModalPrev?.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep -= 1;
        showStep(currentStep);
      }
    });

    const scheduleModalNext = document.getElementById('scheduleModalNext');
    scheduleModalNext?.addEventListener('click', () => {
      if (validateCurrentStep()) {
        if (currentStep < 3) {
          currentStep += 1;
          showStep(currentStep);
        } else {
          submitSchedule();
        }
      }
    });

    const recurrenceTypeEl = document.getElementById('recurrenceType');
    recurrenceTypeEl?.addEventListener('change', updateRecurrenceUI);
  }

  function showStep(step: number) {
    currentStep = step;
    document.querySelectorAll('.schedule-step').forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    const stepEl = document.getElementById(`step${step}`);
    if (stepEl) stepEl.style.display = 'block';

    document.querySelectorAll('.step-indicator').forEach((el, idx) => {
      if (idx + 1 < step) {
        el.classList.add('completed');
        el.classList.remove('active');
      } else if (idx + 1 === step) {
        el.classList.add('active');
        el.classList.remove('completed');
      } else {
        el.classList.remove('active', 'completed');
      }
    });

    const scheduleModalPrev = document.getElementById('scheduleModalPrev');
    if (scheduleModalPrev) {
      (scheduleModalPrev as HTMLElement).style.display = step > 1 ? 'inline-block' : 'none';
    }
    const scheduleModalNext = document.getElementById('scheduleModalNext');
    if (scheduleModalNext) {
      scheduleModalNext.textContent = step === 3 ? 'Create Schedule' : 'Next';
    }

    if (step === 2) {
      updateRecurrenceUI();
      updateGamesPreview();
    }
    if (step === 3) {
      initializeSlotsUI();
    }
  }

  function validateCurrentStep() {
    if (currentStep === 1) {
      const teamAName = (document.getElementById('teamAName') as HTMLInputElement).value.trim();
      const teamBName = (document.getElementById('teamBName') as HTMLInputElement).value.trim();
      if (!teamAName || !teamBName) {
        AdminCommon.showError('Both team names are required');
        return false;
      }
      const slotsPerGameEl = document.getElementById('slotsPerGame') as HTMLInputElement | null;
      if (!slotsPerGameEl) {
        AdminCommon.showError('Slots per game field not found');
        return false;
      }
      const slotsPerGame = parseInt(slotsPerGameEl.value, 10);
      if (!slotsPerGame || slotsPerGame < 2 || slotsPerGame % 2 !== 0) {
        AdminCommon.showError('Slots per game must be an even number (minimum 2)');
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      const recurrenceType = (document.getElementById('recurrenceType') as HTMLSelectElement).value;
      if (recurrenceType === 'WEEKLY') {
        const checked = document.querySelectorAll('#weeklyDays input:checked').length;
        if (checked === 0) {
          AdminCommon.showError('Please select at least one day of the week');
          return false;
        }
      } else if (recurrenceType === 'MONTHLY') {
        const days = (document.getElementById('monthlyDays') as HTMLInputElement).value
          .split(',')
          .map((d) => parseInt(d.trim(), 10))
          .filter((d) => d >= 1 && d <= 31);
        if (days.length === 0) {
          AdminCommon.showError('Please enter at least one valid day of the month (1-31)');
          return false;
        }
      } else if (recurrenceType === 'YEARLY') {
        const month = parseInt(
          (document.getElementById('yearlyMonth') as HTMLSelectElement).value,
          10,
        );
        const day = parseInt((document.getElementById('yearlyDay') as HTMLInputElement).value, 10);
        if (!month || !day || day < 1 || day > 31) {
          AdminCommon.showError('Please select a valid month and day');
          return false;
        }
      } else if (recurrenceType === 'ONCE') {
        const date = (document.getElementById('onceDate') as HTMLInputElement).value;
        if (!date) {
          AdminCommon.showError('Please select a date');
          return false;
        }
      }
      return true;
    }
    if (currentStep === 3) {
      const teamASlots = document.querySelectorAll('#teamASlots .slot-item').length;
      const teamBSlots = document.querySelectorAll('#teamBSlots .slot-item').length;
      if (teamASlots !== teamBSlots) {
        AdminCommon.showError('Teams must have equal number of slots');
        return false;
      }
      return true;
    }
    return true;
  }

  function updateRecurrenceUI() {
    const recurrenceType = (document.getElementById('recurrenceType') as HTMLSelectElement).value;
    (document.getElementById('weeklyOptions') as HTMLElement).style.display = 'none';
    (document.getElementById('monthlyOptions') as HTMLElement).style.display = 'none';
    (document.getElementById('yearlyOptions') as HTMLElement).style.display = 'none';
    (document.getElementById('onceOptions') as HTMLElement).style.display = 'none';

    if (recurrenceType === 'WEEKLY') {
      (document.getElementById('weeklyOptions') as HTMLElement).style.display = 'block';
    } else if (recurrenceType === 'MONTHLY') {
      (document.getElementById('monthlyOptions') as HTMLElement).style.display = 'block';
    } else if (recurrenceType === 'YEARLY') {
      (document.getElementById('yearlyOptions') as HTMLElement).style.display = 'block';
    } else if (recurrenceType === 'ONCE') {
      (document.getElementById('onceOptions') as HTMLElement).style.display = 'block';
    }

    updateGamesPreview();
  }

  function updateGamesPreview() {
    const recurrenceType = (document.getElementById('recurrenceType') as HTMLSelectElement).value;
    let eventsCount = 0;
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    if (recurrenceType === 'WEEKLY') {
      const checkedDays = Array.from(
        document.querySelectorAll('#weeklyDays input:checked'),
      ).map((cb) => parseInt((cb as HTMLInputElement).value, 10));
      let currentDate = new Date(today);
      while (currentDate <= endDate) {
        if (checkedDays.includes(currentDate.getDay())) {
          eventsCount += 1;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (recurrenceType === 'MONTHLY') {
      const days = (document.getElementById('monthlyDays') as HTMLInputElement).value
        .split(',')
        .map((d) => parseInt(d.trim(), 10))
        .filter((d) => d >= 1 && d <= 31);
      let currentDate = new Date(today);
      while (currentDate <= endDate) {
        if (days.includes(currentDate.getDate())) {
          eventsCount += 1;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (recurrenceType === 'YEARLY') {
      const month = parseInt(
        (document.getElementById('yearlyMonth') as HTMLSelectElement).value,
        10,
      );
      const day = parseInt((document.getElementById('yearlyDay') as HTMLInputElement).value, 10);
      if (month && day) {
        let currentDate = new Date(today);
        while (currentDate <= endDate) {
          if (currentDate.getMonth() + 1 === month && currentDate.getDate() === day) {
            eventsCount += 1;
          }
          currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
      }
    } else if (recurrenceType === 'ONCE') {
      eventsCount = 1;
    }

    const eventsPreviewEl = document.getElementById('eventsPreview');
    if (eventsPreviewEl) {
      eventsPreviewEl.textContent = `${eventsCount} games will be created in the next 30 days`;
    }
  }

  function initializeSlotsUI() {
    const slotsPerGameEl = document.getElementById('slotsPerGame') as HTMLInputElement | null;
    if (!slotsPerGameEl) return;
    const slotsPerGame = parseInt(slotsPerGameEl.value, 10) || 10;
    const slotsPerTeam = slotsPerGame / 2;

    const teamASlots = document.getElementById('teamASlots');
    const teamBSlots = document.getElementById('teamBSlots');
    if (teamASlots) teamASlots.innerHTML = '';
    if (teamBSlots) teamBSlots.innerHTML = '';

    let currentUserId: number | null = null;
    try {
      const user = AuthUtils.getUser();
      if (user) {
        currentUserId = user.id;
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }

    for (let i = 1; i <= slotsPerTeam; i += 1) {
      const slotItem = createSlotItem(i, 'A', i === 1 ? currentUserId : null, i === 2 || i === 3);
      teamASlots?.appendChild(slotItem);
    }

    for (let i = 1; i <= slotsPerTeam; i += 1) {
      const slotItem = createSlotItem(slotsPerTeam + i, 'B', null, false);
      teamBSlots?.appendChild(slotItem);
    }
  }

  function createSlotItem(
    slotNumber: number,
    team: string,
    preAssignedUserId: number | null,
    isGoldOnly: boolean,
  ) {
    const div = document.createElement('div');
    div.className = 'slot-item card mb-2';
    div.innerHTML = `
      <div class="card-body">
        <div class="row">
          <div class="col-12 mb-2">
            <strong>Slot ${slotNumber}</strong>
          </div>
          <div class="col-md-6">
            <label>Pre-assigned User:</label>
            <select class="form-control form-control-sm slot-user" data-slot="${slotNumber}" data-team="${team}">
              <option value="">None</option>
              ${allUsers
                .map(
                  (u) =>
                    `<option value="${u.id}" ${
                      u.id === preAssignedUserId ? 'selected' : ''
                    }>${u.email}</option>`,
                )
                .join('')}
            </select>
          </div>
          <div class="col-md-3">
            <div class="form-check mt-4">
              <input class="form-check-input slot-gold" type="checkbox" data-slot="${slotNumber}" data-team="${team}" ${
      isGoldOnly ? 'checked' : ''
    }>
              <label class="form-check-label">Gold Only</label>
            </div>
          </div>
          <div class="col-md-3">
            <label>Coins Cost Override:</label>
            <input type="number" class="form-control form-control-sm slot-cost" data-slot="${slotNumber}" data-team="${team}" placeholder="Default" step="0.01" min="0">
          </div>
        </div>
      </div>
    `;
    return div;
  }

  function collectScheduleData() {
    const scheduleNameValue = (document.getElementById('scheduleName') as HTMLInputElement).value.trim();
    scheduleData = {
      name: scheduleNameValue || undefined,
      description:
        (document.getElementById('scheduleDescription') as HTMLTextAreaElement).value.trim() ||
        null,
      teamAName: (document.getElementById('teamAName') as HTMLInputElement).value.trim(),
      teamBName: (document.getElementById('teamBName') as HTMLInputElement).value.trim(),
      firstGameStartTime: (document.getElementById('firstGameStartTime') as HTMLInputElement).value,
      gamesPerDay: parseInt((document.getElementById('gamesPerDay') as HTMLInputElement).value, 10) || 1,
      spacingAfterFinishMinutes: (document.getElementById('spacingAfterFinishMinutes') as HTMLInputElement).value
        ? parseInt((document.getElementById('spacingAfterFinishMinutes') as HTMLInputElement).value, 10)
        : null,
      reservationCost: parseFloat(
        (document.getElementById('reservationCost') as HTMLInputElement).value,
      ),
      instantReservationCost: (document.getElementById('instantReservationCost') as HTMLInputElement).value
        ? parseFloat((document.getElementById('instantReservationCost') as HTMLInputElement).value)
        : null,
      confirmationWindowMinutes: parseInt(
        (document.getElementById('confirmationWindowMinutes') as HTMLInputElement).value,
        10,
      ),
      refundPolicy: (document.getElementById('refundPolicy') as HTMLSelectElement).value,
      refundPercentage:
        (document.getElementById('refundPolicy') as HTMLSelectElement).value === 'PARTIAL'
          ? parseInt(
              (document.getElementById('refundPercentage') as HTMLInputElement).value,
              10,
            )
          : null,
      isExclusiveToGold: (document.getElementById('isExclusiveToGold') as HTMLInputElement).checked,
      reminderMinutesBefore: (document.getElementById('reminderMinutesBefore') as HTMLInputElement).value
        .split(',')
        .map((m) => parseInt(m.trim(), 10))
        .filter((m) => !isNaN(m)),
      url: (document.getElementById('scheduleUrl') as HTMLInputElement).value.trim() || null,
      slotsPerGame: parseInt((document.getElementById('slotsPerGame') as HTMLInputElement).value, 10),
      isActive: true,
    };

    scheduleData.recurrenceType = (document.getElementById('recurrenceType') as HTMLSelectElement).value;
    if (scheduleData.recurrenceType === 'WEEKLY') {
      scheduleData.recurrenceDays = Array.from(
        document.querySelectorAll('#weeklyDays input:checked'),
      ).map((cb) => parseInt((cb as HTMLInputElement).value, 10));
      scheduleData.recurrencePattern = null;
    } else if (scheduleData.recurrenceType === 'MONTHLY') {
      scheduleData.recurrenceDays = (document.getElementById('monthlyDays') as HTMLInputElement).value
        .split(',')
        .map((d) => parseInt(d.trim(), 10))
        .filter((d) => d >= 1 && d <= 31);
      scheduleData.recurrencePattern = null;
    } else if (scheduleData.recurrenceType === 'YEARLY') {
      scheduleData.recurrenceDays = null;
      scheduleData.recurrencePattern = {
        month: parseInt((document.getElementById('yearlyMonth') as HTMLSelectElement).value, 10),
        day: parseInt((document.getElementById('yearlyDay') as HTMLInputElement).value, 10),
      };
    } else if (scheduleData.recurrenceType === 'ONCE') {
      scheduleData.recurrenceDays = null;
      scheduleData.recurrencePattern = null;
    }

    scheduleData.slotConfigs = [];
    document.querySelectorAll('.slot-item').forEach((item) => {
      const userSelect = item.querySelector('.slot-user') as HTMLSelectElement | null;
      const slotNumber = userSelect ? parseInt(userSelect.dataset.slot || '0', 10) : 0;
      const team = userSelect?.dataset.team || '';
      const preAssignedUserId = userSelect?.value ? parseInt(userSelect.value, 10) : null;
      const isGoldOnly = (item.querySelector('.slot-gold') as HTMLInputElement | null)?.checked || false;
      const coinsCost = (item.querySelector('.slot-cost') as HTMLInputElement | null)?.value
        ? parseFloat((item.querySelector('.slot-cost') as HTMLInputElement).value)
        : null;

      (scheduleData.slotConfigs as Array<Record<string, unknown>>).push({
        slotNumber,
        team,
        preAssignedUserId,
        isGoldOnly,
        coinsCost,
      });
    });
  }

  async function submitSchedule() {
    try {
      AdminCommon.showFullScreenLoader('Creating schedule...');
      collectScheduleData();
      await api.createSchedule(scheduleData);
      AdminCommon.showSuccess('Schedule created successfully!');
      window.$?.('#scheduleModal').modal('hide');
      resetScheduleModal();
      loadSchedules();
    } catch (error) {
      AdminCommon.showError(
        `Failed to create schedule: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      AdminCommon.hideFullScreenLoader();
    }
  }

  function resetScheduleModal() {
    currentStep = 1;
    scheduleData = {};
    const scheduleForm = document.getElementById('scheduleForm') as HTMLFormElement | null;
    scheduleForm?.reset();
    const slotsPerGameEl = document.getElementById('slotsPerGame') as HTMLInputElement | null;
    if (slotsPerGameEl) slotsPerGameEl.value = '10';
    showStep(1);
  }

  globalWindow.showCreateScheduleModal = () => {
    resetScheduleModal();
    window.$?.('#scheduleModal').modal('show');
  };

  globalWindow.viewSchedule = async (scheduleId: number) => {
    const modalBody = document.querySelector('#scheduleDetailsModal .modal-body') as HTMLElement | null;
    try {
      if (modalBody) {
        AdminCommon.showContainerLoader(modalBody, 'Loading schedule details...');
      }
      const schedule = (await api.getSchedule(scheduleId)) as Record<string, unknown>;
      currentEditingSchedule = schedule;
      (document.getElementById('scheduleDetailsId') as HTMLInputElement).value = String(
        scheduleId,
      );
      (document.getElementById('scheduleDetailsEditMode') as HTMLElement).style.display = 'none';
      (document.getElementById('scheduleDetailsEditBtn') as HTMLElement).style.display = 'inline-block';
      (document.getElementById('scheduleDetailsSaveBtn') as HTMLElement).style.display = 'none';

      const overviewHtml = `
        <table class="table table-bordered">
          <tr><th width="30%">ID</th><td>${schedule.id}</td></tr>
          <tr><th>Name</th><td>${schedule.name || 'N/A'}</td></tr>
          <tr><th>Description</th><td>${schedule.description || 'N/A'}</td></tr>
          <tr><th>First Game Start Time</th><td>${schedule.firstGameStartTime}</td></tr>
          <tr><th>Games Per Day</th><td>${schedule.gamesPerDay}</td></tr>
          <tr><th>Spacing After Finish (minutes)</th><td>${schedule.spacingAfterFinishMinutes || 'N/A'}</td></tr>
          <tr><th>Slots Per Game</th><td>${schedule.slotsPerGame}</td></tr>
          <tr><th>Reservation Cost</th><td>${schedule.reservationCost} coins</td></tr>
          <tr><th>Instant Reservation Cost</th><td>${schedule.instantReservationCost || 'N/A'} coins</td></tr>
          <tr><th>Confirmation Window</th><td>${schedule.confirmationWindowMinutes} minutes</td></tr>
          <tr><th>Refund Policy</th><td>${schedule.refundPolicy}</td></tr>
          <tr><th>Refund Percentage</th><td>${schedule.refundPercentage || 'N/A'}%</td></tr>
          <tr><th>Exclusive to Gold</th><td>${schedule.isExclusiveToGold ? 'Yes' : 'No'}</td></tr>
          <tr><th>URL</th><td><a href="${schedule.url || 'https://youtube.com'}" target="_blank">${schedule.url || 'https://youtube.com'}</a></td></tr>
          <tr><th>Reminder Minutes Before</th><td>${schedule.reminderMinutesBefore ? (schedule.reminderMinutesBefore as number[]).join(', ') : 'N/A'}</td></tr>
          <tr><th>Active</th><td>${schedule.isActive ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-secondary">No</span>'}</td></tr>
          <tr><th>Created</th><td>${AdminCommon.formatDate(String(schedule.createdAt || ''))}</td></tr>
          <tr><th>Updated</th><td>${AdminCommon.formatDate(String(schedule.updatedAt || ''))}</td></tr>
        </table>
      `;
      document.getElementById('scheduleOverviewContent')!.innerHTML = overviewHtml;

      let recurrenceHtml = `<table class="table table-bordered"><tr><th width="30%">Recurrence Type</th><td>${schedule.recurrenceType}</td></tr>`;
      if (schedule.recurrenceType === 'WEEKLY') {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const days = schedule.recurrenceDays
          ? (schedule.recurrenceDays as number[]).map((d) => dayNames[d]).join(', ')
          : 'N/A';
        recurrenceHtml += `<tr><th>Days of Week</th><td>${days}</td></tr>`;
      } else if (schedule.recurrenceType === 'MONTHLY') {
        recurrenceHtml += `<tr><th>Days of Month</th><td>${schedule.recurrenceDays ? (schedule.recurrenceDays as number[]).join(', ') : 'N/A'}</td></tr>`;
      } else if (schedule.recurrenceType === 'YEARLY') {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const pattern = schedule.recurrencePattern as { month: number; day: number } | undefined;
        recurrenceHtml += `<tr><th>Date</th><td>${pattern ? `${monthNames[pattern.month]} ${pattern.day}` : 'N/A'}</td></tr>`;
      }
      recurrenceHtml += '</table>';
      document.getElementById('scheduleRecurrenceContent')!.innerHTML = recurrenceHtml;

      let slotsHtml =
        '<table class="table table-bordered table-sm"><thead><tr><th>Slot #</th><th>Team</th><th>Gold Only</th><th>Coins Cost</th><th>Pre-assigned User</th></tr></thead><tbody>';
      if (schedule.slotConfigs && (schedule.slotConfigs as Array<Record<string, unknown>>).length > 0) {
        (schedule.slotConfigs as Array<Record<string, unknown>>)
          .sort((a, b) => Number(a.slotNumber) - Number(b.slotNumber))
          .forEach((config) => {
            slotsHtml += `<tr>
            <td>${config.slotNumber}</td>
            <td>${getTeamDisplayName(String(config.team || ''))}</td>
            <td>${config.isGoldOnly ? '<span class="badge badge-warning">Yes</span>' : 'No'}</td>
            <td>${config.coinsCost || 'Default'}</td>
            <td>${config.preAssignedUser ? (config.preAssignedUser as Record<string, unknown>).email : 'None'}</td>
          </tr>`;
          });
      } else {
        slotsHtml += '<tr><td colspan="5" class="text-center">No slot configs</td></tr>';
      }
      slotsHtml += '</tbody></table>';
      document.getElementById('scheduleSlotsContent')!.innerHTML = slotsHtml;

      let gamesHtml =
        '<table class="table table-bordered table-sm"><thead><tr><th>ID</th><th>Start Time</th><th>Status</th></tr></thead><tbody>';
      if (schedule.games && (schedule.games as Array<Record<string, unknown>>).length > 0) {
        (schedule.games as Array<Record<string, unknown>>)
          .sort(
            (a, b) =>
              new Date(String(a.scheduledStartTime || '')).getTime() -
              new Date(String(b.scheduledStartTime || '')).getTime(),
          )
          .forEach((game) => {
            const statusColors: Record<string, string> = {
              CREATED: 'primary',
              IN_PROGRESS: 'warning',
              FINISHED: 'success',
              CANCELLED: 'danger',
            };
            gamesHtml += `<tr>
            <td>${game.id}</td>
            <td>${AdminCommon.formatDate(String(game.scheduledStartTime || ''))}</td>
            <td><span class="badge badge-${statusColors[String(game.status)] || 'secondary'}">${game.status}</span></td>
          </tr>`;
          });
      } else {
        gamesHtml += '<tr><td colspan="4" class="text-center">No games</td></tr>';
      }
      gamesHtml += '</tbody></table>';
      document.getElementById('scheduleEventsContent')!.innerHTML = gamesHtml;

      if (modalBody) {
        AdminCommon.hideContainerLoader(modalBody);
      }
      window.$?.('#scheduleDetailsModal').modal('show');
    } catch (error) {
      if (modalBody) {
        AdminCommon.hideContainerLoader(modalBody);
      }
      AdminCommon.showError(
        `Failed to load schedule: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.editSchedule = async (scheduleId: number) => {
    await (globalWindow.viewSchedule as (id: number) => Promise<void>)(scheduleId);
    (globalWindow.enableScheduleEdit as () => void)();
  };

  globalWindow.enableScheduleEdit = () => {
    if (!currentEditingSchedule) {
      AdminCommon.showError('Schedule data not loaded. Please refresh and try again.');
      return;
    }

    (document.getElementById('scheduleDetailsEditMode') as HTMLElement).style.display = 'block';
    (document.getElementById('scheduleDetailsEditBtn') as HTMLElement).style.display = 'none';
    (document.getElementById('scheduleDetailsSaveBtn') as HTMLElement).style.display = 'inline-block';

    renderEditableOverview(currentEditingSchedule);
    renderEditableRecurrence(currentEditingSchedule);
    renderEditableSlots(currentEditingSchedule);
  };

  function renderEditableOverview(schedule: Record<string, unknown>) {
    const html = `
      <form id="scheduleEditOverviewForm">
        <div class="form-group">
          <label>Name</label>
          <input type="text" class="form-control" id="editScheduleName" value="${schedule.name || ''}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea class="form-control" id="editScheduleDescription" rows="3">${schedule.description || ''}</textarea>
        </div>
        <input type="hidden" class="form-control" id="editTeamAName" value="${schedule.teamAName || ''}">
        <input type="hidden" class="form-control" id="editTeamBName" value="${schedule.teamBName || ''}">
        <div class="row">
          <div class="col-md-4">
            <div class="form-group">
              <label>First Event Start Time</label>
              <input type="time" class="form-control" id="editFirstGameStartTime" value="${schedule.firstGameStartTime || ''}">
            </div>
          </div>
          <div class="col-md-4">
            <div class="form-group">
              <label>Events Per Day</label>
              <input type="number" class="form-control" id="editGamesPerDay" value="${schedule.gamesPerDay || 1}" min="1">
            </div>
          </div>
          <div class="col-md-4">
            <div class="form-group">
              <label>Spacing After Finish (minutes)</label>
              <input type="number" class="form-control" id="editSpacingAfterFinishMinutes" value="${schedule.spacingAfterFinishMinutes || ''}" min="0">
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-md-4">
            <div class="form-group">
              <label>Reservation Cost (coins)</label>
              <input type="number" class="form-control" id="editReservationCost" value="${schedule.reservationCost || 0}" step="0.01" min="0">
            </div>
          </div>
          <div class="col-md-4">
            <div class="form-group">
              <label>Instant Reservation Cost (coins)</label>
              <input type="number" class="form-control" id="editInstantReservationCost" value="${schedule.instantReservationCost || ''}" step="0.01" min="0">
            </div>
          </div>
          <div class="col-md-4">
            <div class="form-group">
              <label>Confirmation Window (minutes)</label>
              <input type="number" class="form-control" id="editConfirmationWindowMinutes" value="${schedule.confirmationWindowMinutes || 0}" min="0">
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-md-4">
            <div class="form-group">
              <label>Refund Policy</label>
              <select class="form-control" id="editRefundPolicy">
                <option value="NONE" ${schedule.refundPolicy === 'NONE' ? 'selected' : ''}>None</option>
                <option value="FULL" ${schedule.refundPolicy === 'FULL' ? 'selected' : ''}>Full</option>
                <option value="PARTIAL" ${schedule.refundPolicy === 'PARTIAL' ? 'selected' : ''}>Partial</option>
              </select>
            </div>
          </div>
          <div class="col-md-4">
            <div class="form-group">
              <label>Refund Percentage (%)</label>
              <input type="number" class="form-control" id="editRefundPercentage" value="${schedule.refundPercentage || ''}" min="0" max="100" ${schedule.refundPolicy !== 'PARTIAL' ? 'disabled' : ''}>
            </div>
          </div>
          <div class="col-md-4">
            <div class="form-group">
              <label>URL</label>
              <input type="text" class="form-control" id="editScheduleUrl" value="${schedule.url || ''}">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Reminder Minutes Before (comma-separated)</label>
          <input type="text" class="form-control" id="editReminderMinutesBefore" value="${schedule.reminderMinutesBefore ? (schedule.reminderMinutesBefore as number[]).join(', ') : ''}" placeholder="e.g., 60, 30, 15">
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="editIsExclusiveToGold" ${schedule.isExclusiveToGold ? 'checked' : ''}>
          <label class="form-check-label">Exclusive to Gold Subscribers</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="editIsActive" ${schedule.isActive ? 'checked' : ''}>
          <label class="form-check-label">Active</label>
        </div>
      </form>
    `;
    document.getElementById('scheduleOverviewContent')!.innerHTML = html;

    document.getElementById('editRefundPolicy')?.addEventListener('change', function (this: HTMLSelectElement) {
      const refundPercentageEl = document.getElementById('editRefundPercentage') as HTMLInputElement | null;
      if (refundPercentageEl) {
        refundPercentageEl.disabled = this.value !== 'PARTIAL';
        if (this.value !== 'PARTIAL') {
          refundPercentageEl.value = '';
        }
      }
    });
  }

  function renderEditableRecurrence(schedule: Record<string, unknown>) {
    const html = `
      <form id="scheduleEditRecurrenceForm">
        <div class="form-group">
          <label>Recurrence Type</label>
          <select class="form-control" id="editRecurrenceType">
            <option value="WEEKLY" ${schedule.recurrenceType === 'WEEKLY' ? 'selected' : ''}>Weekly</option>
            <option value="MONTHLY" ${schedule.recurrenceType === 'MONTHLY' ? 'selected' : ''}>Monthly</option>
            <option value="YEARLY" ${schedule.recurrenceType === 'YEARLY' ? 'selected' : ''}>Yearly</option>
            <option value="ONCE" ${schedule.recurrenceType === 'ONCE' ? 'selected' : ''}>Once</option>
          </select>
        </div>
        <div id="editRecurrenceOptions"></div>
      </form>
    `;
    document.getElementById('scheduleRecurrenceContent')!.innerHTML = html;
    renderRecurrenceOptions(schedule);
    document.getElementById('editRecurrenceType')?.addEventListener('change', function (this: HTMLSelectElement) {
      renderRecurrenceOptions({ ...schedule, recurrenceType: this.value });
    });
  }

  function renderRecurrenceOptions(schedule: Record<string, unknown>) {
    const container = document.getElementById('editRecurrenceOptions');
    const type = schedule.recurrenceType as string;

    if (!container) return;

    if (type === 'WEEKLY') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const selectedDays = (schedule.recurrenceDays as number[]) || [];
      const checkboxes = dayNames
        .map(
          (name, index) =>
            `<div class="form-check form-check-inline">
          <input class="form-check-input" type="checkbox" id="editWeeklyDay${index}" value="${index}" ${
              selectedDays.includes(index) ? 'checked' : ''
            }>
          <label class="form-check-label" for="editWeeklyDay${index}">${name}</label>
        </div>`,
        )
        .join('');
      container.innerHTML = `<div class="form-group"><label>Days of Week</label><div>${checkboxes}</div></div>`;
    } else if (type === 'MONTHLY') {
      const days = schedule.recurrenceDays ? (schedule.recurrenceDays as number[]).join(', ') : '';
      container.innerHTML = `
        <div class="form-group">
          <label>Days of Month (comma-separated, e.g., 1, 15, 30)</label>
          <input type="text" class="form-control" id="editMonthlyDays" value="${days}">
        </div>
      `;
    } else if (type === 'YEARLY') {
      const pattern = schedule.recurrencePattern as { month: number; day: number } | undefined;
      const month = pattern ? pattern.month : '';
      const day = pattern ? pattern.day : '';
      const monthNames = [
        '',
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const monthOptions = monthNames
        .slice(1)
        .map(
          (name, idx) =>
            `<option value="${idx + 1}" ${month === idx + 1 ? 'selected' : ''}>${name}</option>`,
        )
        .join('');
      container.innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label>Month</label>
              <select class="form-control" id="editYearlyMonth">${monthOptions}</select>
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-group">
              <label>Day</label>
              <input type="number" class="form-control" id="editYearlyDay" value="${day}" min="1" max="31">
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = '<p class="text-muted">No additional options for this recurrence type.</p>';
    }
  }

  function renderEditableSlots(schedule: Record<string, unknown>) {
    let html =
      '<form id="scheduleEditSlotsForm"><div class="table-responsive"><table class="table table-bordered table-sm"><thead><tr><th>Slot #</th><th>Team</th><th>Gold Only</th><th>Coins Cost</th><th>Pre-assigned User</th></tr></thead><tbody>';
    if (schedule.slotConfigs && (schedule.slotConfigs as Array<Record<string, unknown>>).length > 0) {
      (schedule.slotConfigs as Array<Record<string, unknown>>)
        .sort((a, b) => Number(a.slotNumber) - Number(b.slotNumber))
        .forEach((config) => {
          const userOptions = allUsers
            .map(
              (u) =>
                `<option value="${u.id}" ${config.preAssignedUserId === u.id ? 'selected' : ''}>${u.email}</option>`,
            )
            .join('');
          html += `<tr>
          <td>${config.slotNumber}</td>
          <td>${getTeamDisplayName(String(config.team || ''))}</td>
          <td>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" data-slot="${config.slotNumber}" id="editSlotGold${config.slotNumber}" ${config.isGoldOnly ? 'checked' : ''}>
            </div>
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" data-slot="${config.slotNumber}" id="editSlotCost${config.slotNumber}" value="${config.coinsCost || ''}" step="0.01" min="0" placeholder="Default">
          </td>
          <td>
            <select class="form-control form-control-sm" data-slot="${config.slotNumber}" id="editSlotUser${config.slotNumber}">
              <option value="">None</option>
              ${userOptions}
            </select>
          </td>
        </tr>`;
        });
    }
    html += '</tbody></table></div></form>';
    document.getElementById('scheduleSlotsContent')!.innerHTML = html;
  }

  globalWindow.saveScheduleChanges = async () => {
    const scheduleId = (document.getElementById('scheduleDetailsId') as HTMLInputElement).value;
    const propagateNow = (document.getElementById('scheduleDetailsPropagateNow') as HTMLInputElement)
      .checked;

    try {
      const updateData: Record<string, unknown> = {
        name: (document.getElementById('editScheduleName') as HTMLInputElement).value.trim(),
        description:
          (document.getElementById('editScheduleDescription') as HTMLTextAreaElement).value.trim() ||
          null,
        teamAName: (document.getElementById('editTeamAName') as HTMLInputElement).value.trim(),
        teamBName: (document.getElementById('editTeamBName') as HTMLInputElement).value.trim(),
        firstGameStartTime: (document.getElementById('editFirstGameStartTime') as HTMLInputElement).value,
        gamesPerDay:
          parseInt((document.getElementById('editGamesPerDay') as HTMLInputElement).value, 10) || 1,
        spacingAfterFinishMinutes: (document.getElementById('editSpacingAfterFinishMinutes') as HTMLInputElement)
          .value
          ? parseInt(
              (document.getElementById('editSpacingAfterFinishMinutes') as HTMLInputElement).value,
              10,
            )
          : null,
        reservationCost:
          parseFloat((document.getElementById('editReservationCost') as HTMLInputElement).value) || 0,
        instantReservationCost: (document.getElementById('editInstantReservationCost') as HTMLInputElement).value
          ? parseFloat(
              (document.getElementById('editInstantReservationCost') as HTMLInputElement).value,
            )
          : null,
        confirmationWindowMinutes:
          parseInt(
            (document.getElementById('editConfirmationWindowMinutes') as HTMLInputElement).value,
            10,
          ) || 0,
        refundPolicy: (document.getElementById('editRefundPolicy') as HTMLSelectElement).value,
        refundPercentage:
          (document.getElementById('editRefundPolicy') as HTMLSelectElement).value === 'PARTIAL' &&
          (document.getElementById('editRefundPercentage') as HTMLInputElement).value
            ? parseInt((document.getElementById('editRefundPercentage') as HTMLInputElement).value, 10)
            : null,
        isExclusiveToGold: (document.getElementById('editIsExclusiveToGold') as HTMLInputElement).checked,
        reminderMinutesBefore: (document.getElementById('editReminderMinutesBefore') as HTMLInputElement).value
          .split(',')
          .map((m) => parseInt(m.trim(), 10))
          .filter((m) => !isNaN(m)),
        url: (document.getElementById('editScheduleUrl') as HTMLInputElement).value.trim() || null,
        isActive: (document.getElementById('editIsActive') as HTMLInputElement).checked,
        propagateNow,
      };

      const recurrenceType =
        (document.getElementById('editRecurrenceType') as HTMLSelectElement).value;
      updateData.recurrenceType = recurrenceType;

      if (recurrenceType === 'WEEKLY') {
        updateData.recurrenceDays = Array.from(
          document.querySelectorAll('#editRecurrenceOptions input:checked'),
        ).map((cb) => parseInt((cb as HTMLInputElement).value, 10));
        updateData.recurrencePattern = null;
      } else if (recurrenceType === 'MONTHLY') {
        updateData.recurrenceDays = (document.getElementById('editMonthlyDays') as HTMLInputElement).value
          .split(',')
          .map((d) => parseInt(d.trim(), 10))
          .filter((d) => d >= 1 && d <= 31);
        updateData.recurrencePattern = null;
      } else if (recurrenceType === 'YEARLY') {
        updateData.recurrenceDays = null;
        updateData.recurrencePattern = {
          month: parseInt((document.getElementById('editYearlyMonth') as HTMLSelectElement).value, 10),
          day: parseInt((document.getElementById('editYearlyDay') as HTMLInputElement).value, 10),
        };
      } else {
        updateData.recurrenceDays = null;
        updateData.recurrencePattern = null;
      }

      updateData.slotConfigs = [];
      if (currentEditingSchedule?.slotConfigs) {
        (currentEditingSchedule.slotConfigs as Array<Record<string, unknown>>).forEach((config) => {
          const slotNumber = Number(config.slotNumber);
          (updateData.slotConfigs as Array<Record<string, unknown>>).push({
            slotNumber,
            team: config.team,
            isGoldOnly: (document.getElementById(`editSlotGold${slotNumber}`) as HTMLInputElement).checked,
            coinsCost: (document.getElementById(`editSlotCost${slotNumber}`) as HTMLInputElement).value
              ? parseFloat((document.getElementById(`editSlotCost${slotNumber}`) as HTMLInputElement).value)
              : null,
            preAssignedUserId: (document.getElementById(`editSlotUser${slotNumber}`) as HTMLSelectElement).value
              ? parseInt(
                  (document.getElementById(`editSlotUser${slotNumber}`) as HTMLSelectElement).value,
                  10,
                )
              : null,
          });
        });
      }

      await api.updateSchedule(parseInt(scheduleId, 10), updateData);
      AdminCommon.showSuccess('Schedule updated successfully!');
      window.$?.('#scheduleDetailsModal').modal('hide');
      loadSchedules();
    } catch (error) {
      AdminCommon.showError(
        `Failed to save schedule: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.deleteSchedule = async (scheduleId: number, buttonElement: HTMLElement) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    const button = buttonElement || null;
    try {
      if (button) AdminCommon.showButtonLoader(button);
      await api.deleteSchedule(scheduleId);
      AdminCommon.showSuccess('Schedule deleted successfully!');
      loadSchedules();
    } catch (error) {
      AdminCommon.showError(
        `Failed to delete schedule: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      if (button) AdminCommon.hideButtonLoader(button);
    }
  };

  globalWindow.showGenerateGamesModal = (scheduleId: number) => {
    (document.getElementById('generateEventsScheduleId') as HTMLInputElement).value =
      String(scheduleId);
    const today = new Date().toISOString().split('T')[0];
    (document.getElementById('generateEventsDate') as HTMLInputElement).value = today;
    window.$?.('#generateEventsModal').modal('show');
  };

  globalWindow.showGenerateEventsModal = globalWindow.showGenerateGamesModal;

  globalWindow.generateGames = async () => {
    const scheduleId = parseInt(
      (document.getElementById('generateEventsScheduleId') as HTMLInputElement).value,
      10,
    );
    const date = (document.getElementById('generateEventsDate') as HTMLInputElement).value;

    if (!date) {
      AdminCommon.showError('Please select a date');
      return;
    }
    try {
      AdminCommon.showFullScreenLoader('Generating games...');
      const result = (await api.generateGamesForSchedule(scheduleId, date)) as {
        gamesCreated?: number;
      };
      AdminCommon.showSuccess(
        `Successfully generated ${result.gamesCreated || 0} game(s) for ${date}`,
      );
      window.$?.('#generateEventsModal').modal('hide');
      loadSchedules();
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

  globalWindow.generateEvents = globalWindow.generateGames;

  const recurrenceTypeEl = document.getElementById('recurrenceType');
  recurrenceTypeEl?.addEventListener('change', updateRecurrenceUI);
  document.getElementById('monthlyDays')?.addEventListener('input', updateGamesPreview);
  document.getElementById('yearlyMonth')?.addEventListener('change', updateGamesPreview);
  document.getElementById('yearlyDay')?.addEventListener('change', updateGamesPreview);

  globalWindow.applyScheduleFilter = () => {
    const filterValue = (document.getElementById('scheduleFilter') as HTMLSelectElement).value;
    localStorage.setItem('schedulesFilter', filterValue);
    loadSchedules();
  };

  document.querySelectorAll('#weeklyDays input').forEach((cb) => {
    cb.addEventListener('change', updateGamesPreview);
  });

  document.getElementById('slotsPerGame')?.addEventListener('change', () => {
    if (currentStep === 3) {
      initializeSlotsUI();
    }
  });

  return () => {
    cleanupWebSocket();
    if (schedulesTable) {
      schedulesTable.destroy();
      schedulesTable = null;
    }
    delete globalWindow.showCreateScheduleModal;
    delete globalWindow.viewSchedule;
    delete globalWindow.editSchedule;
    delete globalWindow.enableScheduleEdit;
    delete globalWindow.saveScheduleChanges;
    delete globalWindow.deleteSchedule;
    delete globalWindow.showGenerateGamesModal;
    delete globalWindow.showGenerateEventsModal;
    delete globalWindow.generateGames;
    delete globalWindow.generateEvents;
    delete globalWindow.applyScheduleFilter;
  };
}

export default function SchedulesPage() {
  return <LegacyPage html={schedulesHtml} onMount={initSchedulesPage} />;
}
