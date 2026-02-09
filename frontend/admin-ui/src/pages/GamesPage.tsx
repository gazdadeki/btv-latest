import React from 'react';
import LegacyPage from '@/components/LegacyPage';

const gamesHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6"><h1 class="m-0">Games</h1></div>
          <div class="col-sm-6">
            <button class="btn btn-danger float-right mr-2" onclick="cancelAllActiveGames()">
              <i class="fas fa-times-circle"></i> Cancel All Active Games
            </button>
            <button class="btn btn-primary float-right" onclick="showCreateEventModal()">
              <i class="fas fa-plus"></i> New Game
            </button>
          </div>
        </div>
      </div>
    </div>
    <section class="content">
      <div class="container-fluid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Filters</h3>
            <div class="card-tools">
              <button type="button" class="btn btn-tool" data-card-widget="collapse">
                <i class="fas fa-minus"></i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-3">
                <div class="form-group">
                  <label>Schedule</label>
                  <select class="form-control" id="filterSchedule">
                    <option value="">All Schedules</option>
                  </select>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Status</label>
                  <select class="form-control" id="filterStatus">
                    <option value="">All Statuses</option>
                    <option value="CREATED">Created</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="FINISHED">Finished</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Start Date From</label>
                  <input type="date" class="form-control" id="filterStartDate" />
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Start Date To</label>
                  <input type="date" class="form-control" id="filterEndDate" />
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-12">
                <button type="button" class="btn btn-primary" onclick="applyFilters()">
                  Apply Filters
                </button>
                <button type="button" class="btn btn-secondary" onclick="clearFilters()">
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <table id="eventsTable" class="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Schedule</th>
                  <th>Start Time</th>
                  <th>Status</th>
                  <th>Slots Reserved</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="6" class="text-center text-muted">Loading...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div class="modal fade" id="createEventModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Create Game</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="createEventForm">
            <div class="form-group">
              <label>Schedule *</label>
              <select class="form-control" id="createEventScheduleId" required>
                <option value="">Select Schedule</option>
              </select>
            </div>
            <div class="form-group">
              <label>Scheduled Start Time *</label>
              <input type="datetime-local" class="form-control" id="createEventStartTime" required />
            </div>
            <input type="hidden" id="createEventTeamAName" placeholder="Leave empty to use schedule default" value="Scourge" />
            <input type="hidden" id="createEventTeamBName" placeholder="Leave empty to use schedule default" value="Sentinel" />
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="createEventIsExclusiveToGold" />
              <label class="form-check-label">Exclusive to Gold Subscribers</label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="submitCreateEvent()">Create Game</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="eventDetailsModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-xl" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Game Details</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="eventDetailsId" />
          <ul class="nav nav-tabs" id="eventDetailsTabs" role="tablist">
            <li class="nav-item">
              <a class="nav-link active" id="eventInfo-tab" data-toggle="tab" href="#eventInfo" role="tab">Game Info</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="slotsManagement-tab" data-toggle="tab" href="#slotsManagement" role="tab">Slots Management</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="reservations-tab" data-toggle="tab" href="#reservations" role="tab">Reservations</a>
            </li>
          </ul>

          <div class="tab-content mt-3" id="eventDetailsTabContent">
            <div class="tab-pane fade show active" id="eventInfo" role="tabpanel">
              <div id="eventInfoContent"></div>
            </div>
            <div class="tab-pane fade" id="slotsManagement" role="tabpanel">
              <div id="slotsManagementContent"></div>
            </div>
            <div class="tab-pane fade" id="reservations" role="tabpanel">
              <div id="reservationsContent"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="userSearchModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Search User</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <input type="text" class="form-control" id="userSearchInput" placeholder="Search by email or ID..." />
            <input type="hidden" id="userSearchEventId" />
            <input type="hidden" id="userSearchSlotId" />
          </div>
          <div id="userSearchResults" class="list-group" style="max-height: 400px; overflow-y: auto">
            <div class="list-group-item text-center text-muted">Start typing to search...</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="reReserveModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Re-reserve Slot</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <p class="mb-3">
            This slot was previously reserved but is now
            <span id="reReserveStatus" class="badge badge-secondary">EXPIRED</span>.
          </p>
          <div class="card mb-3">
            <div class="card-body">
              <h6 class="card-title">Current User</h6>
              <p class="card-text mb-0" id="reReserveCurrentUser">Loading...</p>
            </div>
          </div>
          <p class="text-muted">
            Choose how you want to re-reserve this slot:
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="reReserveSameUserBtn" onclick="reReserveForSameUser()">
            <i class="fas fa-user"></i> Re-reserve for Same User
          </button>
          <button type="button" class="btn btn-info" id="reReserveDifferentUserBtn" onclick="reReserveForDifferentUser()">
            <i class="fas fa-user-plus"></i> Re-reserve for Different User
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="finishGameModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Finish Game</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="finishGameForm">
            <input type="hidden" id="finishGameId" />
            <div class="form-group">
              <label>Winning Team *</label>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="winningTeam" id="winningTeamA" value="A" required />
                <label class="form-check-label" for="winningTeamA">
                  <span id="finishGameTeamAName">Scourge</span>
                </label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="winningTeam" id="winningTeamB" value="B" required />
                <label class="form-check-label" for="winningTeamB">
                  <span id="finishGameTeamBName">Sentinel</span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label>Game URL</label>
              <input type="url" class="form-control" id="finishGameUrl" placeholder="https://youtube.com" />
              <small class="form-text text-muted">URL to include in finish notifications</small>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="submitFinishGame()">Finish Game</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="autoStartNextGameModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Next Game</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="nextGameId" />
          <p class="mb-3">
            Next game found! How would you like to proceed?
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="handleAutoStartManual()">Start Manually</button>
          <button type="button" class="btn btn-success" onclick="handleAutoStartNow()">Start Now</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
  </footer>
`;

function initGamesPage() {
  const globalWindow = window as unknown as {
    EventsPage?: { init?: () => void; cleanup?: () => void };
  };
  const scriptId = 'legacy-events-script';
  const ensureScript = () => {
    if (globalWindow.EventsPage?.init) {
      globalWindow.EventsPage.init();
      return;
    }
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = '/admin/assets/js/events.js';
      script.onload = () => {
        globalWindow.EventsPage?.init?.();
      };
      document.body.appendChild(script);
    } else {
      globalWindow.EventsPage?.init?.();
    }
  };

  ensureScript();

  return () => {
    globalWindow.EventsPage?.cleanup?.();
  };
}

export default function GamesPage() {
  return <LegacyPage html={gamesHtml} onMount={initGamesPage} />;
}
