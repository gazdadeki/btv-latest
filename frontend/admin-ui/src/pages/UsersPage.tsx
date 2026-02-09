import React from 'react';
import LegacyPage from '@/components/LegacyPage';
import { api } from '@/lib/api';
import { AdminCommon } from '@/lib/adminCommon';

interface AdminUser {
  id: number;
  email: string;
  username?: string | null;
  role: string;
  subscriptionTier: string;
  isVerified: boolean;
  isBanned: boolean;
  isVoided?: boolean;
  stripeCustomerId?: string | null;
  createdAt: string;
  wallet?: { balance: string | number };
  statistics?: Record<string, number>;
  fullName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  country?: string | null;
  updatedAt?: string;
  bannedUntil?: string | null;
}

const usersHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Users</h1>
          </div>
        </div>
      </div>
    </div>

    <section class="content">
      <div class="container-fluid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">User TEST</h3>
            <div class="card-tools">
              <button
                type="button"
                class="btn btn-primary btn-sm mr-2"
                onclick="showCreateUserModal()"
              >
                <i class="fas fa-plus"></i> Create New User
              </button>
              <select
                id="filterRole"
                class="form-control form-control-sm"
                style="display: inline-block; width: auto"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="player">Player</option>
              </select>
              <select
                id="filterVerified"
                class="form-control form-control-sm ml-2"
                style="display: inline-block; width: auto"
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>
          </div>
          <div class="card-body">
            <table id="usersTable" class="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Tier</th>
                  <th>Verified</th>
                  <th>Banned</th>
                  <th>Stripe</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="10" class="text-center text-muted">Loading...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- User Details Modal -->
  <div class="modal fade" id="userDetailsModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-xl" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">User Details</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body" id="userDetailsContent">
          <ul class="nav nav-tabs" id="userDetailsTabs" role="tablist">
            <li class="nav-item">
              <a class="nav-link active" id="overview-tab" data-toggle="tab" href="#overview" role="tab" aria-controls="overview" aria-selected="true">
                <i class="fas fa-user"></i> Overview
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="wallet-tab" data-toggle="tab" href="#wallet" role="tab" aria-controls="wallet" aria-selected="false">
                <i class="fas fa-wallet"></i> Wallet
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="statistics-tab" data-toggle="tab" href="#statistics" role="tab" aria-controls="statistics" aria-selected="false">
                <i class="fas fa-chart-bar"></i> Statistics
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" id="payment-methods-tab" data-toggle="tab" href="#payment-methods" role="tab" aria-controls="payment-methods" aria-selected="false">
                <i class="fas fa-credit-card"></i> Payment Methods
              </a>
            </li>
          </ul>

          <div class="tab-content" id="userDetailsTabContent">
            <div class="tab-pane fade show active" id="overview" role="tabpanel" aria-labelledby="overview-tab">
              <div class="text-center mt-3">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Loading user details...</p>
              </div>
            </div>
            <div class="tab-pane fade" id="wallet" role="tabpanel" aria-labelledby="wallet-tab">
              <div class="mt-3" id="walletTabContent">
                <div class="text-center">
                  <i class="fas fa-spinner fa-spin fa-2x"></i>
                  <p>Loading wallet information...</p>
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="statistics" role="tabpanel" aria-labelledby="statistics-tab">
              <div class="mt-3" id="statisticsTabContent">
                <div class="text-center">
                  <i class="fas fa-spinner fa-spin fa-2x"></i>
                  <p>Loading statistics...</p>
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="payment-methods" role="tabpanel" aria-labelledby="payment-methods-tab">
              <div class="mt-3" id="paymentMethodsTabContent">
                <div class="text-center">
                  <i class="fas fa-spinner fa-spin fa-2x"></i>
                  <p>Loading payment methods...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
          <button type="button" class="btn btn-primary" id="editUserFromDetailsBtn" onclick="editUserFromDetails()">
            <i class="fas fa-edit"></i> Edit User
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit User Modal -->
  <div class="modal fade" id="editUserModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Edit User</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form id="editUserForm" onsubmit="saveEditUser(event)">
          <div class="modal-body">
            <input type="hidden" id="editUserId" />
            <div class="form-group">
              <label for="editUserEmail">Email</label>
              <input type="email" class="form-control" id="editUserEmail" required />
            </div>
            <div class="form-group">
              <label for="editUserUsername">Username</label>
              <input type="text" class="form-control" id="editUserUsername" minlength="3" maxlength="30" pattern="[a-zA-Z0-9_-]+" />
              <small class="form-text text-muted">3-30 characters, alphanumeric, underscores, and hyphens only</small>
            </div>
            <div class="form-group">
              <label for="editUserPassword">Password (leave blank to keep current)</label>
              <input type="password" class="form-control" id="editUserPassword" minlength="6" />
            </div>
            <div class="form-group">
              <label for="editUserRole">Role</label>
              <select class="form-control" id="editUserRole" required>
                <option value="player">Player</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label for="editUserSubscriptionTier">Subscription Tier</label>
              <select class="form-control" id="editUserSubscriptionTier" required>
                <option value="FREE">FREE</option>
                <option value="GOLD">GOLD</option>
              </select>
            </div>
            <div class="form-group">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" id="editUserIsVerified" />
                <label class="form-check-label" for="editUserIsVerified">Verified</label>
              </div>
            </div>
            <hr />
            <h6>Address Information</h6>
            <div class="form-group">
              <label for="editUserFullName">Full Name</label>
              <input type="text" class="form-control" id="editUserFullName" maxlength="255" />
            </div>
            <div class="form-group">
              <label for="editUserAddressLine1">Address Line 1</label>
              <input type="text" class="form-control" id="editUserAddressLine1" maxlength="255" />
            </div>
            <div class="form-group">
              <label for="editUserAddressLine2">Address Line 2</label>
              <input type="text" class="form-control" id="editUserAddressLine2" maxlength="255" />
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label for="editUserCity">City</label>
                  <input type="text" class="form-control" id="editUserCity" maxlength="100" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label for="editUserState">State</label>
                  <input type="text" class="form-control" id="editUserState" maxlength="100" />
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label for="editUserCountry">Country</label>
                  <input type="text" class="form-control" id="editUserCountry" maxlength="100" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label for="editUserZipcode">ZIP Code</label>
                  <input type="text" class="form-control" id="editUserZipcode" maxlength="20" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Create User Modal -->
  <div class="modal fade" id="createUserModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Create New User</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form id="createUserForm" onsubmit="saveCreateUser(event)">
          <div class="modal-body">
            <div class="form-group">
              <label for="createUserEmail">Email</label>
              <input type="email" class="form-control" id="createUserEmail" required />
            </div>
            <div class="form-group">
              <label for="createUserUsername">Username</label>
              <input type="text" class="form-control" id="createUserUsername" minlength="3" maxlength="30" pattern="[a-zA-Z0-9_-]+" required />
              <small class="form-text text-muted">3-30 characters, alphanumeric, underscores, and hyphens only</small>
            </div>
            <div class="form-group">
              <label for="createUserPassword">Password</label>
              <input type="password" class="form-control" id="createUserPassword" required minlength="6" />
              <small class="form-text text-muted">Minimum 6 characters</small>
            </div>
            <div class="form-group">
              <label for="createUserRole">Role</label>
              <select class="form-control" id="createUserRole" required>
                <option value="player">Player</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label for="createUserSubscriptionTier">Subscription Tier</label>
              <select class="form-control" id="createUserSubscriptionTier" required>
                <option value="FREE">FREE</option>
                <option value="GOLD">GOLD</option>
              </select>
            </div>
            <div class="form-group">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" id="createUserIsVerified" />
                <label class="form-check-label" for="createUserIsVerified">Verified</label>
              </div>
            </div>
            <hr />
            <h6>Address Information</h6>
            <div class="form-group">
              <label for="createUserFullName">Full Name</label>
              <input type="text" class="form-control" id="createUserFullName" maxlength="255" />
            </div>
            <div class="form-group">
              <label for="createUserAddressLine1">Address Line 1</label>
              <input type="text" class="form-control" id="createUserAddressLine1" maxlength="255" />
            </div>
            <div class="form-group">
              <label for="createUserAddressLine2">Address Line 2</label>
              <input type="text" class="form-control" id="createUserAddressLine2" maxlength="255" />
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label for="createUserCity">City</label>
                  <input type="text" class="form-control" id="createUserCity" maxlength="100" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label for="createUserState">State</label>
                  <input type="text" class="form-control" id="createUserState" maxlength="100" />
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label for="createUserCountry">Country</label>
                  <input type="text" class="form-control" id="createUserCountry" maxlength="100" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label for="createUserZipcode">ZIP Code</label>
                  <input type="text" class="form-control" id="createUserZipcode" maxlength="20" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Create User</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Ban User Modal -->
  <div class="modal fade" id="banUserModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Ban User</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form id="banUserForm" onsubmit="saveBanUser(event)">
          <div class="modal-body">
            <input type="hidden" id="banUserId" />
            <div class="form-group">
              <label>Ban Type</label>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="banType" id="banTypePermanent" value="permanent" checked />
                <label class="form-check-label" for="banTypePermanent">Permanent Ban</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="banType" id="banTypeTemporary" value="temporary" />
                <label class="form-check-label" for="banTypeTemporary">Temporary Ban</label>
              </div>
            </div>
            <div class="form-group" id="banDaysGroup" style="display: none">
              <label for="banDays">Ban for how many days?</label>
              <input type="number" class="form-control" id="banDays" min="1" value="1" />
            </div>
            <div class="form-group" id="banDateGroup" style="display: none">
              <label for="banUntilDate">Ban until date</label>
              <input type="date" class="form-control" id="banUntilDate" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-danger">Ban User</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Delete User Modal -->
  <div class="modal fade" id="deleteUserModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Delete User</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form id="deleteUserForm" onsubmit="saveDeleteUser(event)">
          <div class="modal-body">
            <input type="hidden" id="deleteUserId" />
            <p>Are you sure you want to delete this user? This will mark the user as voided (soft delete).</p>
            <div class="form-group">
              <label for="deleteUserReason">Reason for deletion (optional)</label>
              <textarea class="form-control" id="deleteUserReason" rows="3" placeholder="Enter reason for deletion..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-danger">Delete User</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Stripe Link Management Modal -->
  <div class="modal fade" id="stripeLinkModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Manage Stripe Customer Link</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body" id="stripeLinkContent">
          <div class="text-center">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Loading Stripe information...</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Verification Code Display Modal -->
  <div class="modal fade" id="verificationCodeModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Verification Code</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body" id="verificationCodeContent">
          <div class="text-center">
            <p class="mb-3">
              Verification code for user:
              <strong id="verificationCodeUserEmail"></strong>
            </p>
            <div class="alert alert-info" id="verificationCodeDisplay" style="font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem;">
              <i class="fas fa-spinner fa-spin"></i>
            </div>
            <p class="text-muted mb-3" id="verificationCodeExpires"></p>
            <div class="btn-group" role="group">
              <button type="button" class="btn btn-primary" onclick="copyVerificationCode()">
                <i class="fas fa-copy"></i> Copy to Clipboard
              </button>
              <button type="button" class="btn btn-secondary" onclick="printVerificationCode()">
                <i class="fas fa-print"></i> Print
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
  </footer>
`;

function normalizeUsers(response: unknown): AdminUser[] {
  if (Array.isArray(response)) {
    return response as AdminUser[];
  }
  if (response && typeof response === 'object') {
    const data = (response as { data?: AdminUser[] }).data;
    if (Array.isArray(data)) {
      return data;
    }
  }
  return [];
}

function initUsersPage() {
  let usersTable: { destroy: () => void } | null = null;
  let currentUserId: number | null = null;

  AdminCommon.init();

  const globalWindow = window as unknown as Record<string, unknown>;
  const callGlobal = (name: string, ...args: unknown[]) => {
    const fn = globalWindow[name];
    if (typeof fn === 'function') {
      (fn as (...fnArgs: unknown[]) => void)(...args);
    }
  };

  const filterRole = document.getElementById('filterRole');
  const filterVerified = document.getElementById('filterVerified');
  if (filterRole) filterRole.addEventListener('change', loadUsers);
  if (filterVerified) filterVerified.addEventListener('change', loadUsers);

  async function loadUsers() {
    const tableContainer =
      document.querySelector('.card-body') ||
      document.querySelector('#usersTable')?.parentElement;
    const role = (document.getElementById('filterRole') as HTMLSelectElement | null)
      ?.value;
    const verified = (
      document.getElementById('filterVerified') as HTMLSelectElement | null
    )?.value;

    const filters: Record<string, unknown> = {};
    if (role) filters.role = role;
    if (verified !== '') filters.isVerified = verified === 'true';

    try {
      if (tableContainer) {
        AdminCommon.showContainerLoader(tableContainer, 'Loading users...');
      }

      const usersResponse = await api.getUsers(filters);
      const users = normalizeUsers(usersResponse);

      if (usersTable) {
        usersTable.destroy();
      }

      const tbody = document.querySelector('#usersTable tbody');
      if (tbody && users.length > 0) {
        tbody.innerHTML = users
          .map(
            (u) => `
        <tr>
          <td>${u.id}</td>
          <td>${u.email}</td>
          <td>${u.username || '<span class="text-muted">-</span>'}</td>
          <td><span class="badge badge-${u.role === 'admin' ? 'danger' : 'primary'}">${u.role}</span></td>
          <td><span class="badge badge-${u.subscriptionTier === 'GOLD' ? 'warning' : 'secondary'}">${u.subscriptionTier}</span></td>
          <td>${u.isVerified ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>'}</td>
          <td>${u.isBanned ? '<span class="badge badge-danger">Yes</span>' : '<span class="badge badge-success">No</span>'}</td>
          <td>
            ${
              u.stripeCustomerId
                ? `<span class="badge badge-success">Linked</span><br><small class="text-muted">${u.stripeCustomerId.substring(0, 20)}...</small>`
                : '<span class="badge badge-secondary">Not Linked</span>'
            }
          </td>
          <td>${AdminCommon.formatDateOnly(u.createdAt)}</td>
          <td>
            <button class="btn btn-sm btn-info" onclick="viewUser(${u.id})" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-warning" onclick="editUser(${u.id})" title="Edit User">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="messageUser(${u.id})" title="Send Message">
              <i class="fas fa-comments"></i>
            </button>
            <button class="btn btn-sm btn-info" onclick="manageStripeLink(${u.id})" title="Manage Stripe Link">
              <i class="fas fa-credit-card"></i>
            </button>
            ${
              !u.isVerified
                ? `
              <button class="btn btn-sm btn-success" onclick="requestVerificationForUser(${u.id})" title="Request Verification Code">
                <i class="fas fa-envelope"></i>
              </button>
              <button class="btn btn-sm btn-primary" onclick="verifyUserInstantly(${u.id})" title="Verify Instantly">
                <i class="fas fa-check"></i>
              </button>
            `
                : ''
            }
            ${
              u.isBanned
                ? `
              <button class="btn btn-sm btn-warning" onclick="unbanUser(${u.id})" title="Unban User">
                <i class="fas fa-unlock"></i>
              </button>
            `
                : `
              <button class="btn btn-sm btn-danger" onclick="showBanUserModal(${u.id})" title="Ban User">
                <i class="fas fa-ban"></i>
              </button>
            `
            }
            ${
              !u.isVoided
                ? `
              <button class="btn btn-sm btn-dark" onclick="deleteUser(${u.id})" title="Delete User">
                <i class="fas fa-trash"></i>
              </button>
            `
                : ''
            }
          </td>
        </tr>
      `,
          )
          .join('');

        usersTable = AdminCommon.initDataTable('#usersTable', {}, 'usersTable');
      } else if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="10" class="text-center text-muted">No users found</td></tr>';
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      const tbody = document.querySelector('#usersTable tbody');
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="10" class="text-center text-danger">Failed to load users</td></tr>';
      }
      AdminCommon.showError(
        `Failed to load users: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      if (tableContainer) {
        AdminCommon.hideContainerLoader(tableContainer);
      }
    }
  }

  function renderTransactions(transactions: Array<Record<string, unknown>>) {
    if (!transactions || transactions.length === 0) {
      return '<p class="text-muted">No transactions found</p>';
    }

    const transactionTypeLabels: Record<
      string,
      { class: string; icon: string }
    > = {
      DEPOSIT: { class: 'success', icon: 'plus' },
      WITHDRAWAL: { class: 'danger', icon: 'minus' },
      RESERVATION_COST: { class: 'warning', icon: 'shopping-cart' },
      CONFIRMATION_COST: { class: 'warning', icon: 'check' },
      REFUND: { class: 'info', icon: 'undo' },
      REWARD: { class: 'success', icon: 'gift' },
      STRIPE_PURCHASE: { class: 'primary', icon: 'credit-card' },
    };

    return `
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map((t) => {
                const type = String(t.type || '');
                const typeInfo = transactionTypeLabels[type] || {
                  class: 'secondary',
                  icon: 'circle',
                };
                const amount = Math.round(parseFloat(String(t.amount || 0)));
                const isPositive =
                  type === 'DEPOSIT' ||
                  type === 'REFUND' ||
                  type === 'REWARD' ||
                  type === 'STRIPE_PURCHASE';
                return `
                  <tr>
                    <td>${AdminCommon.formatDate(String(t.createdAt || ''))}</td>
                    <td><span class="badge badge-${typeInfo.class}"><i class="fas fa-${typeInfo.icon}"></i> ${type}</span></td>
                    <td class="${isPositive ? 'text-success' : 'text-danger'}">
                      ${isPositive ? '+' : '-'}${amount}
                    </td>
                    <td>${t.description || '-'}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  globalWindow.viewUser = async (userId: number) => {
    try {
      currentUserId = userId;
      window.$?.('#userDetailsTabs a[href="#overview"]').tab('show');

      const [user, transactions, paymentMethods] = await Promise.all([
        api.getUser(userId) as Promise<AdminUser>,
        api.getUserWalletTransactions(userId).catch(() => ({ data: [] })),
        api.getAdminUserPaymentMethods(userId).catch(() => ({ paymentMethods: [] })),
      ]);

      const walletBalance = user.wallet
        ? Math.round(parseFloat(String(user.wallet.balance)))
        : 0;
      const stats = user.statistics || {};

      const overviewHtml = `
        <div class="row mt-3">
          <div class="col-md-6">
            <table class="table table-bordered">
              <tr><th width="40%">ID</th><td>${user.id}</td></tr>
              <tr><th>Email</th><td>${user.email}</td></tr>
              <tr><th>Username</th><td>${user.username || '<span class="text-muted">-</span>'}</td></tr>
              <tr><th>Role</th><td><span class="badge badge-${user.role === 'admin' ? 'danger' : 'primary'}">${user.role}</span></td></tr>
              <tr><th>Subscription Tier</th><td><span class="badge badge-${user.subscriptionTier === 'GOLD' ? 'warning' : 'secondary'}">${user.subscriptionTier}</span></td></tr>
              <tr><th>Verified</th><td>${user.isVerified ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>'}</td></tr>
              <tr><th>Banned</th><td>${user.isBanned ? '<span class="badge badge-danger">Yes' + (user.bannedUntil ? ` (until ${AdminCommon.formatDate(user.bannedUntil)})` : ' (Permanent)') + '</span>' : '<span class="badge badge-success">No</span>'}</td></tr>
              <tr><th>Voided</th><td>${user.isVoided ? '<span class="badge badge-dark">Yes</span>' : '<span class="badge badge-success">No</span>'}</td></tr>
              <tr><th>Created</th><td>${AdminCommon.formatDate(user.createdAt)}</td></tr>
              <tr><th>Updated</th><td>${AdminCommon.formatDate(user.updatedAt || user.createdAt)}</td></tr>
            </table>
            ${
              user.fullName || user.addressLine1 || user.city
                ? `
            <h5 class="mt-3">Address Information</h5>
            <table class="table table-bordered">
              ${user.fullName ? `<tr><th width="40%">Full Name</th><td>${user.fullName}</td></tr>` : ''}
              ${user.addressLine1 ? `<tr><th>Address Line 1</th><td>${user.addressLine1}</td></tr>` : ''}
              ${user.addressLine2 ? `<tr><th>Address Line 2</th><td>${user.addressLine2}</td></tr>` : ''}
              ${user.city || user.state || user.zipcode ? `<tr><th>City, State ZIP</th><td>${[user.city, user.state, user.zipcode].filter(Boolean).join(', ')}</td></tr>` : ''}
              ${user.country ? `<tr><th>Country</th><td>${user.country}</td></tr>` : ''}
            </table>
            `
                : ''
            }
          </div>
          <div class="col-md-6">
            <h5>Quick Stats</h5>
            <table class="table table-bordered">
              <tr><th width="40%">Wallet Balance</th><td><strong>${walletBalance} coins</strong></td></tr>
              <tr><th>Total Wins</th><td>${stats.totalWins || 0}</td></tr>
              <tr><th>Total Losses</th><td>${stats.totalLosses || 0}</td></tr>
              <tr><th>Total Games</th><td>${stats.totalEvents || 0}</td></tr>
              <tr><th>Total Reservations</th><td>${stats.totalReservations || 0}</td></tr>
            </table>
          </div>
        </div>
      `;

      const walletHtml = `
        <div class="row mt-3">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Current Balance</h5>
              </div>
              <div class="card-body">
                <h2 class="text-primary" id="walletBalanceDisplay">${walletBalance} coins</h2>
              </div>
            </div>
            <div class="card mt-3">
              <div class="card-header">
                <h5 class="mb-0">Grant Coins</h5>
              </div>
              <div class="card-body">
                <form id="grantCoinsForm" onsubmit="saveGrantCoins(event, ${userId})">
                  <div class="form-group">
                    <label for="grantCoinsAmount">Amount</label>
                    <input type="number" class="form-control" id="grantCoinsAmount" min="0.01" step="0.01" required />
                  </div>
                  <div class="form-group">
                    <label for="grantCoinsDescription">Description (optional)</label>
                    <textarea class="form-control" id="grantCoinsDescription" rows="2" placeholder="e.g., Bonus coins, Refund, etc."></textarea>
                  </div>
                  <button type="submit" class="btn btn-primary">
                    <i class="fas fa-coins"></i> Grant Coins
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Recent Transactions</h5>
              </div>
              <div class="card-body">
                <div id="walletTransactionsList">
                  ${renderTransactions((transactions as { data?: Array<Record<string, unknown>> }).data || [])}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      const statisticsHtml = `
        <div class="row mt-3">
          <div class="col-md-12">
            <table class="table table-bordered">
              <tr><th width="30%">Total Wins</th><td>${stats.totalWins || 0}</td></tr>
              <tr><th>Total Losses</th><td>${stats.totalLosses || 0}</td></tr>
              <tr><th>Total Games</th><td>${stats.totalEvents || 0}</td></tr>
              <tr><th>Total Reservations</th><td>${stats.totalReservations || 0}</td></tr>
              <tr><th>Coins Spent</th><td>${Math.round(parseFloat(String(stats.totalCoinsSpent || 0)))} coins</td></tr>
              <tr><th>Coins Earned</th><td>${Math.round(parseFloat(String(stats.totalCoinsEarned || 0)))} coins</td></tr>
            </table>
          </div>
        </div>
      `;

      const paymentMethodsHtml = `
        <div class="row mt-3">
          <div class="col-md-12">
            ${
              (paymentMethods as { paymentMethods?: Array<Record<string, unknown>> })
                .paymentMethods &&
              (paymentMethods as { paymentMethods?: Array<Record<string, unknown>> })
                .paymentMethods!.length > 0
                ? `
                <div class="table-responsive">
                  <table class="table table-bordered">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Card Details</th>
                        <th>Expires</th>
                        <th>Default</th>
                        <th>Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(paymentMethods as { paymentMethods: Array<Record<string, unknown>> })
                        .paymentMethods.map((pm) => `
                        <tr>
                          <td><span class="badge badge-info">${String(pm.type || '').toUpperCase()}</span></td>
                          <td>
                            ${pm.brand ? `<i class="fab fa-cc-${String(pm.brand).toLowerCase()}"></i> ` : ''}
                            ${pm.last4 ? `**** **** **** ${pm.last4}` : 'N/A'}
                          </td>
                          <td>${pm.expMonth && pm.expYear ? `${pm.expMonth}/${pm.expYear}` : 'N/A'}</td>
                          <td>${pm.isDefault ? '<span class="badge badge-success">Default</span>' : '<span class="badge badge-secondary">-</span>'}</td>
                          <td>${AdminCommon.formatDate(String(pm.createdAt || ''))}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `
                : '<p class="text-muted">No payment methods found</p>'
            }
          </div>
        </div>
      `;

      const overviewEl = document.getElementById('overview');
      const walletEl = document.getElementById('walletTabContent');
      const statisticsEl = document.getElementById('statisticsTabContent');
      const paymentMethodsEl = document.getElementById('paymentMethodsTabContent');
      if (overviewEl) overviewEl.innerHTML = overviewHtml;
      if (walletEl) walletEl.innerHTML = walletHtml;
      if (statisticsEl) statisticsEl.innerHTML = statisticsHtml;
      if (paymentMethodsEl) paymentMethodsEl.innerHTML = paymentMethodsHtml;

      const editBtn = document.getElementById('editUserFromDetailsBtn');
      if (editBtn) editBtn.setAttribute('data-user-id', String(userId));
      window.$?.('#userDetailsModal').modal('show');
    } catch (error) {
      console.error('Failed to load user details:', error);
      AdminCommon.showError(
        `Failed to load user details: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.saveGrantCoins = async (event: Event, userId: number) => {
    event.preventDefault();
    const amount = parseFloat(
      (document.getElementById('grantCoinsAmount') as HTMLInputElement).value,
    );
    const description = (
      document.getElementById('grantCoinsDescription') as HTMLTextAreaElement
    ).value.trim();

    if (isNaN(amount) || amount <= 0) {
      AdminCommon.showError('Please enter a valid amount greater than 0');
      return;
    }

    try {
      const result = (await api.grantCoinsToUser(
        userId,
        amount,
        description,
      )) as { wallet: { balance: string } };

      const newBalance = Math.round(parseFloat(result.wallet.balance));
      const balanceEl = document.getElementById('walletBalanceDisplay');
      if (balanceEl) balanceEl.textContent = `${newBalance} coins`;

      const transactions = (await api.getUserWalletTransactions(userId)) as {
        data?: Array<Record<string, unknown>>;
      };
      const listEl = document.getElementById('walletTransactionsList');
      if (listEl) {
        listEl.innerHTML = renderTransactions(transactions.data || []);
      }

      const formEl = document.getElementById('grantCoinsForm') as HTMLFormElement | null;
      formEl?.reset();

      AdminCommon.showSuccess(
        `${amount} coins granted successfully. New balance: ${newBalance} coins`,
      );

      await loadUsers();
    } catch (error) {
      console.error('Failed to grant coins:', error);
      AdminCommon.showError(
        `Failed to grant coins: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.editUserFromDetails = () => {
    window.$?.('#userDetailsModal').modal('hide');
    const userId = document
      .getElementById('editUserFromDetailsBtn')
      ?.getAttribute('data-user-id');
    if (userId) {
      callGlobal('editUser', parseInt(userId, 10));
    }
  };

  globalWindow.showCreateUserModal = () => {
    const form = document.getElementById('createUserForm') as HTMLFormElement | null;
    form?.reset();
    window.$?.('#createUserModal').modal('show');
  };

  globalWindow.saveCreateUser = async (event: Event) => {
    event.preventDefault();

    const email = (document.getElementById('createUserEmail') as HTMLInputElement).value;
    const username = (document.getElementById('createUserUsername') as HTMLInputElement)
      .value.trim();
    const password = (document.getElementById('createUserPassword') as HTMLInputElement)
      .value;
    const role = (document.getElementById('createUserRole') as HTMLSelectElement).value;
    const subscriptionTier = (
      document.getElementById('createUserSubscriptionTier') as HTMLSelectElement
    ).value;
    const isVerified = (document.getElementById('createUserIsVerified') as HTMLInputElement)
      .checked;

    const userData: Record<string, unknown> = {
      email,
      username,
      password,
      role,
      subscriptionTier,
      isVerified,
    };

    const fullName = (document.getElementById('createUserFullName') as HTMLInputElement)
      .value.trim();
    const addressLine1 = (
      document.getElementById('createUserAddressLine1') as HTMLInputElement
    ).value.trim();
    const addressLine2 = (
      document.getElementById('createUserAddressLine2') as HTMLInputElement
    ).value.trim();
    const city = (document.getElementById('createUserCity') as HTMLInputElement).value.trim();
    const state = (document.getElementById('createUserState') as HTMLInputElement).value.trim();
    const country = (document.getElementById('createUserCountry') as HTMLInputElement)
      .value.trim();
    const zipcode = (document.getElementById('createUserZipcode') as HTMLInputElement)
      .value.trim();

    if (fullName) userData.fullName = fullName;
    if (addressLine1) userData.addressLine1 = addressLine1;
    if (addressLine2) userData.addressLine2 = addressLine2;
    if (city) userData.city = city;
    if (state) userData.state = state;
    if (country) userData.country = country;
    if (zipcode) userData.zipcode = zipcode;

    try {
      await api.createUser(userData);
      AdminCommon.showSuccess('User created successfully');
      window.$?.('#createUserModal').modal('hide');
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      AdminCommon.showError(
        `Failed to create user: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.editUser = async (userId: number) => {
    try {
      const user = (await api.getUser(userId)) as AdminUser;
      (document.getElementById('editUserId') as HTMLInputElement).value = String(user.id);
      (document.getElementById('editUserEmail') as HTMLInputElement).value = user.email;
      (document.getElementById('editUserUsername') as HTMLInputElement).value =
        user.username || '';
      (document.getElementById('editUserRole') as HTMLSelectElement).value = user.role;
      (document.getElementById('editUserSubscriptionTier') as HTMLSelectElement).value =
        user.subscriptionTier;
      (document.getElementById('editUserIsVerified') as HTMLInputElement).checked =
        user.isVerified;
      (document.getElementById('editUserPassword') as HTMLInputElement).value = '';
      (document.getElementById('editUserFullName') as HTMLInputElement).value =
        user.fullName || '';
      (document.getElementById('editUserAddressLine1') as HTMLInputElement).value =
        user.addressLine1 || '';
      (document.getElementById('editUserAddressLine2') as HTMLInputElement).value =
        user.addressLine2 || '';
      (document.getElementById('editUserCity') as HTMLInputElement).value = user.city || '';
      (document.getElementById('editUserState') as HTMLInputElement).value = user.state || '';
      (document.getElementById('editUserCountry') as HTMLInputElement).value =
        user.country || '';
      (document.getElementById('editUserZipcode') as HTMLInputElement).value =
        user.zipcode || '';
      window.$?.('#editUserModal').modal('show');
    } catch (error) {
      console.error('Failed to load user for editing:', error);
      AdminCommon.showError(
        `Failed to load user: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.saveEditUser = async (event: Event) => {
    event.preventDefault();
    const userId = parseInt(
      (document.getElementById('editUserId') as HTMLInputElement).value,
      10,
    );
    const email = (document.getElementById('editUserEmail') as HTMLInputElement).value;
    const username = (document.getElementById('editUserUsername') as HTMLInputElement)
      .value.trim();
    const password = (document.getElementById('editUserPassword') as HTMLInputElement).value;
    const role = (document.getElementById('editUserRole') as HTMLSelectElement).value;
    const subscriptionTier = (
      document.getElementById('editUserSubscriptionTier') as HTMLSelectElement
    ).value;
    const isVerified = (document.getElementById('editUserIsVerified') as HTMLInputElement)
      .checked;

    const updateData: Record<string, unknown> = {
      email,
      role,
      subscriptionTier,
      isVerified,
    };

    updateData.username = username || null;
    if (password) {
      updateData.password = password;
    }

    const fullName = (document.getElementById('editUserFullName') as HTMLInputElement)
      .value.trim();
    const addressLine1 = (
      document.getElementById('editUserAddressLine1') as HTMLInputElement
    ).value.trim();
    const addressLine2 = (
      document.getElementById('editUserAddressLine2') as HTMLInputElement
    ).value.trim();
    const city = (document.getElementById('editUserCity') as HTMLInputElement).value.trim();
    const state = (document.getElementById('editUserState') as HTMLInputElement).value.trim();
    const country = (document.getElementById('editUserCountry') as HTMLInputElement)
      .value.trim();
    const zipcode = (document.getElementById('editUserZipcode') as HTMLInputElement)
      .value.trim();

    updateData.fullName = fullName || null;
    updateData.addressLine1 = addressLine1 || null;
    updateData.addressLine2 = addressLine2 || null;
    updateData.city = city || null;
    updateData.state = state || null;
    updateData.country = country || null;
    updateData.zipcode = zipcode || null;

    try {
      await api.updateUser(userId, updateData);
      AdminCommon.showSuccess('User updated successfully');
      window.$?.('#editUserModal').modal('hide');
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      AdminCommon.showError(
        `Failed to update user: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.requestVerificationForUser = async (userId: number) => {
    try {
      const user = (await api.getUser(userId)) as AdminUser;
      try {
        await api.adminRequestVerification(userId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('already verified')) {
          AdminCommon.showError('User is already verified');
          loadUsers();
          return;
        }
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      const codeData = (await api.getLatestVerificationCode(userId)) as {
        code?: string;
        expiresAt?: string;
      };
      if (codeData?.code) {
        const emailEl = document.getElementById('verificationCodeUserEmail');
        const codeEl = document.getElementById('verificationCodeDisplay');
        const expiresEl = document.getElementById('verificationCodeExpires');
        if (emailEl) emailEl.textContent = user.email;
        if (codeEl) {
          codeEl.textContent = codeData.code;
          codeEl.className = 'alert alert-info';
          codeEl.setAttribute(
            'style',
            'font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem;',
          );
        }
        if (expiresEl) {
          const expiresAt = new Date(codeData.expiresAt || '');
          expiresEl.textContent = `Expires: ${AdminCommon.formatDate(expiresAt)}`;
          expiresEl.setAttribute('data-code', codeData.code);
        }
        window.$?.('#verificationCodeModal').modal('show');
        AdminCommon.showSuccess(
          'Verification code requested and sent (check console)',
        );
      } else {
        AdminCommon.showError(
          'Verification code was generated but could not be retrieved. Please check console logs.',
        );
      }
    } catch (error) {
      console.error('Failed to request verification code:', error);
      AdminCommon.showError(
        `Failed to request verification code: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.verifyUserInstantly = async (userId: number) => {
    if (confirm('Verify this user instantly (without code)?')) {
      try {
        await api.adminVerifyUser(userId);
        AdminCommon.showSuccess('User verified successfully');
        await loadUsers();
      } catch (error) {
        console.error('Failed to verify user:', error);
        AdminCommon.showError(
          `Failed to verify user: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  };

  globalWindow.copyVerificationCode = () => {
    const code = document.getElementById('verificationCodeDisplay')?.textContent?.trim();
    if (!code) return;
    navigator.clipboard
      .writeText(code)
      .then(() => {
        AdminCommon.showSuccess('Verification code copied to clipboard');
      })
      .catch((error) => {
        console.error('Failed to copy:', error);
        AdminCommon.showError('Failed to copy code to clipboard');
      });
  };

  globalWindow.printVerificationCode = () => {
    const printContent = `
      <html>
        <head>
          <title>Verification Code</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .code { font-size: 4rem; font-weight: bold; letter-spacing: 1rem; margin: 20px 0; }
            .info { font-size: 1.2rem; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>Verification Code</h1>
          <div class="info">User: ${document.getElementById('verificationCodeUserEmail')?.textContent}</div>
          <div class="code">${document.getElementById('verificationCodeDisplay')?.textContent?.trim()}</div>
          <div class="info">${document.getElementById('verificationCodeExpires')?.textContent}</div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  globalWindow.showBanUserModal = (userId: number) => {
    (document.getElementById('banUserId') as HTMLInputElement).value = String(userId);
    (document.getElementById('banTypePermanent') as HTMLInputElement).checked = true;
    (document.getElementById('banTypeTemporary') as HTMLInputElement).checked = false;
    const banDaysGroup = document.getElementById('banDaysGroup');
    const banDateGroup = document.getElementById('banDateGroup');
    if (banDaysGroup) banDaysGroup.style.display = 'none';
    if (banDateGroup) banDateGroup.style.display = 'none';
    (document.getElementById('banDays') as HTMLInputElement).value = '1';

    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('banUntilDate') as HTMLInputElement;
    if (dateInput) {
      dateInput.value = today;
      dateInput.setAttribute('min', today);
    }
    window.$?.('#banUserModal').modal('show');
  };

  document.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target || target.name !== 'banType') return;
    if (target.value === 'permanent') {
      document.getElementById('banDaysGroup')!.style.display = 'none';
      document.getElementById('banDateGroup')!.style.display = 'none';
    } else {
      document.getElementById('banDaysGroup')!.style.display = 'block';
      document.getElementById('banDateGroup')!.style.display = 'block';
    }
  });

  globalWindow.saveBanUser = async (event: Event) => {
    event.preventDefault();
    const userId = parseInt(
      (document.getElementById('banUserId') as HTMLInputElement).value,
      10,
    );
    const banType = (document.querySelector('input[name="banType"]:checked') as HTMLInputElement)
      .value;

    try {
      let bannedUntil: Date | null = null;
      if (banType === 'temporary') {
        const dateInput = (document.getElementById('banUntilDate') as HTMLInputElement)
          .value;
        const daysInput = (document.getElementById('banDays') as HTMLInputElement)
          .value;
        if (dateInput) {
          bannedUntil = new Date(`${dateInput}T23:59:59`);
          if (isNaN(bannedUntil.getTime())) {
            AdminCommon.showError('Invalid date selected');
            return;
          }
          if (bannedUntil < new Date()) {
            AdminCommon.showError('Ban until date must be in the future');
            return;
          }
        } else if (daysInput) {
          const days = parseInt(daysInput, 10);
          if (isNaN(days) || days < 1) {
            AdminCommon.showError('Please enter a valid number of days (minimum 1)');
            return;
          }
          bannedUntil = new Date();
          bannedUntil.setDate(bannedUntil.getDate() + days);
          bannedUntil.setHours(23, 59, 59, 999);
        } else {
          AdminCommon.showError('Please specify either number of days or ban until date');
          return;
        }
      }

      await api.updateUser(userId, {
        isBanned: true,
        bannedUntil: bannedUntil ? bannedUntil.toISOString() : null,
      });

      AdminCommon.showSuccess('User banned successfully');
      window.$?.('#banUserModal').modal('hide');
      await loadUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
      AdminCommon.showError(
        `Failed to ban user: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.banUser = (userId: number) => {
    callGlobal('showBanUserModal', userId);
  };

  globalWindow.manageStripeLink = async (userId: number) => {
    try {
      const [user, stripeInfo] = await Promise.all([
        api.getUser(userId) as Promise<AdminUser>,
        api.getUserStripeInfo(userId).catch(() => ({ linked: false, customer: null })),
      ]);

      const stripe = stripeInfo as { linked?: boolean; customer?: Record<string, unknown> };
      const isLinked = stripe.linked && user.stripeCustomerId;
      const customer = stripe.customer;

      let content = `
        <div class="mb-3">
          <h6>Current Status</h6>
          <p>
            ${
              isLinked
                ? `<span class="badge badge-success">Linked to Stripe Customer</span><br>
                 <small class="text-muted mt-2 d-block">Customer ID: ${user.stripeCustomerId}</small>`
                : '<span class="badge badge-secondary">Not Linked</span>'
            }
          </p>
        </div>
      `;

      if (isLinked && customer) {
        content += `
          <div class="mb-3">
            <h6>Customer Information</h6>
            <table class="table table-sm table-bordered">
              <tr><th width="40%">Email</th><td>${customer.email || 'N/A'}</td></tr>
              <tr><th>Created</th><td>${customer.created ? new Date((customer.created as number) * 1000).toLocaleString() : 'N/A'}</td></tr>
              <tr><th>Balance</th><td>$${(((customer.balance as number) || 0) / 100).toFixed(2)}</td></tr>
            </table>
          </div>
          <div class="mb-3">
            <button class="btn btn-danger btn-block" onclick="unlinkStripeCustomer(${userId})">
              <i class="fas fa-unlink"></i> Unlink Stripe Customer
            </button>
          </div>
        `;
      } else {
        content += `
          <div class="mb-3">
            <h6>Link Options</h6>
            <div class="form-group">
              <label>Link to Existing Customer</label>
              <input type="text" class="form-control" id="stripeCustomerIdInput" placeholder="cus_...">
            </div>
            <button class="btn btn-primary btn-block mb-2" onclick="linkStripeCustomer(${userId})">
              <i class="fas fa-link"></i> Link to Customer ID
            </button>
            <hr>
            <button class="btn btn-success btn-block" onclick="createStripeCustomer(${userId})">
              <i class="fas fa-plus"></i> Create New Stripe Customer
            </button>
          </div>
        `;
      }

      const contentEl = document.getElementById('stripeLinkContent');
      if (contentEl) {
        contentEl.innerHTML = content;
      }
      window.$?.('#stripeLinkModal').modal('show');
    } catch (error) {
      console.error('Failed to load Stripe info:', error);
      AdminCommon.showError(
        `Failed to load Stripe information: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.linkStripeCustomer = async (userId: number) => {
    const customerId = (
      document.getElementById('stripeCustomerIdInput') as HTMLInputElement
    ).value.trim();
    if (!customerId) {
      AdminCommon.showError('Please enter a Stripe customer ID');
      return;
    }
    try {
      await api.linkUserStripeCustomer(userId, customerId);
      AdminCommon.showSuccess('Stripe customer linked successfully');
      window.$?.('#stripeLinkModal').modal('hide');
      await loadUsers();
    } catch (error) {
      console.error('Failed to link Stripe customer:', error);
      AdminCommon.showError(
        `Failed to link Stripe customer: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.unlinkStripeCustomer = async (userId: number) => {
    if (!confirm('Are you sure you want to unlink this Stripe customer?')) {
      return;
    }
    try {
      await api.unlinkUserStripeCustomer(userId);
      AdminCommon.showSuccess('Stripe customer unlinked successfully');
      window.$?.('#stripeLinkModal').modal('hide');
      await loadUsers();
    } catch (error) {
      console.error('Failed to unlink Stripe customer:', error);
      AdminCommon.showError(
        `Failed to unlink Stripe customer: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.createStripeCustomer = async (userId: number) => {
    try {
      await api.createStripeCustomerForUser(userId);
      AdminCommon.showSuccess('Stripe customer created and linked successfully');
      window.$?.('#stripeLinkModal').modal('hide');
      await loadUsers();
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      AdminCommon.showError(
        `Failed to create Stripe customer: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.unbanUser = async (userId: number) => {
    if (confirm('Unban this user?')) {
      try {
        await api.updateUser(userId, { isBanned: false, bannedUntil: null });
        AdminCommon.showSuccess('User unbanned successfully');
        await loadUsers();
      } catch (error) {
        console.error('Failed to unban user:', error);
        AdminCommon.showError(
          `Failed to unban user: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  };

  globalWindow.deleteUser = (userId: number) => {
    (document.getElementById('deleteUserId') as HTMLInputElement).value = String(userId);
    (document.getElementById('deleteUserReason') as HTMLTextAreaElement).value = '';
    window.$?.('#deleteUserModal').modal('show');
  };

  globalWindow.saveDeleteUser = async (event: Event) => {
    event.preventDefault();
    const userId = parseInt(
      (document.getElementById('deleteUserId') as HTMLInputElement).value,
      10,
    );
    const reason = (
      document.getElementById('deleteUserReason') as HTMLTextAreaElement
    ).value.trim();

    try {
      await api.deleteUser(userId, reason || null);
      AdminCommon.showSuccess('User deleted successfully');
      window.$?.('#deleteUserModal').modal('hide');
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      AdminCommon.showError(
        `Failed to delete user: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.messageUser = (userId: number) => {
    sessionStorage.setItem('startConversationWithUserId', String(userId));
    window.location.href = '/admin/messages';
  };

  loadUsers();

  return () => {
    if (usersTable) {
      usersTable.destroy();
      usersTable = null;
    }
    delete globalWindow.viewUser;
  };
}

export default function UsersPage() {
  return <LegacyPage html={usersHtml} onMount={initUsersPage} />;
}
