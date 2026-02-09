import React from 'react';
import LegacyPage from '@/components/LegacyPage';
import { api } from '@/lib/api';
import { AdminCommon } from '@/lib/adminCommon';

type SimpleMDEInstance = {
  value: (val?: string) => string;
  toTextArea: () => void;
};

const tutorialsHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Tutorials</h1>
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
                  <label>Status</label>
                  <select class="form-control" id="filterStatus">
                    <option value="">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Featured</label>
                  <select class="form-control" id="filterFeatured">
                    <option value="">All</option>
                    <option value="true">Featured</option>
                    <option value="false">Not Featured</option>
                  </select>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Category</label>
                  <select class="form-control" id="filterCategory">
                    <option value="">All Categories</option>
                  </select>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Tag</label>
                  <select class="form-control" id="filterTag">
                    <option value="">All Tags</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Tutorial Management</h3>
            <div class="card-tools">
              <button type="button" class="btn btn-primary btn-sm mr-2" onclick="showCreateTutorialModal()">
                <i class="fas fa-plus"></i> Create New Tutorial
              </button>
              <button type="button" class="btn btn-info btn-sm mr-2" onclick="showTagsManagementModal()">
                <i class="fas fa-tags"></i> Manage Tags
              </button>
              <button type="button" class="btn btn-info btn-sm mr-2" onclick="showCategoriesManagementModal()">
                <i class="fas fa-folder"></i> Manage Categories
              </button>
            </div>
          </div>
          <div class="card-body">
            <table id="tutorialsTable" class="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Views</th>
                  <th>Author</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="8" class="text-center text-muted">Loading...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>

  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
  </footer>

  <div class="modal fade" id="tagsManagementModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Tags Management</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <button type="button" class="btn btn-primary btn-sm" onclick="showCreateTagModal()">
              <i class="fas fa-plus"></i> Create New Tag
            </button>
          </div>
          <table id="tagsTable" class="table table-bordered table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="5" class="text-center text-muted">Loading...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="tagModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="tagModalTitle">Create New Tag</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form id="tagForm" onsubmit="saveTag(event)">
          <div class="modal-body">
            <input type="hidden" id="tagId" />
            <div class="form-group">
              <label for="tagName">Name *</label>
              <input type="text" class="form-control" id="tagName" required maxlength="100" />
            </div>
            <div class="form-group">
              <label for="tagSlug">Slug</label>
              <input type="text" class="form-control" id="tagSlug" maxlength="100" />
              <small class="form-text text-muted">URL-friendly identifier (auto-generated from name if empty)</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Tag</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div class="modal fade" id="categoriesManagementModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Categories Management</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <button type="button" class="btn btn-primary btn-sm" onclick="showCreateCategoryModal()">
              <i class="fas fa-plus"></i> Create New Category
            </button>
          </div>
          <table id="categoriesTable" class="table table-bordered table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Created</th>
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
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="categoryModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="categoryModalTitle">Create New Category</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form id="categoryForm" onsubmit="saveCategory(event)">
          <div class="modal-body">
            <input type="hidden" id="categoryId" />
            <div class="form-group">
              <label for="categoryName">Name *</label>
              <input type="text" class="form-control" id="categoryName" required maxlength="100" />
            </div>
            <div class="form-group">
              <label for="categoryDescription">Description</label>
              <textarea class="form-control" id="categoryDescription" rows="3" maxlength="500"></textarea>
            </div>
            <div class="form-group">
              <label for="categorySlug">Slug</label>
              <input type="text" class="form-control" id="categorySlug" maxlength="100" />
              <small class="form-text text-muted">URL-friendly identifier (auto-generated from name if empty)</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Category</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div class="modal fade" id="tutorialModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-xl" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="tutorialModalTitle">Create New Tutorial</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form id="tutorialForm" onsubmit="saveTutorial(event)">
          <div class="modal-body">
            <input type="hidden" id="tutorialId" />
            <div class="form-group">
              <label for="tutorialTitle">Title *</label>
              <input type="text" class="form-control" id="tutorialTitle" required maxlength="255" />
            </div>
            <div class="form-group">
              <label for="tutorialSlug">Slug</label>
              <input type="text" class="form-control" id="tutorialSlug" maxlength="255" />
              <small class="form-text text-muted">URL-friendly identifier (auto-generated from title if empty)</small>
            </div>
            <div class="form-group">
              <label for="tutorialExcerpt">Excerpt</label>
              <textarea class="form-control" id="tutorialExcerpt" rows="3" maxlength="500"></textarea>
              <small class="form-text text-muted">Short description (max 500 characters)</small>
            </div>
            <div class="form-group">
              <label for="tutorialBody">Body (Markdown) *</label>
              <textarea class="form-control" id="tutorialBody" rows="15"></textarea>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label for="tutorialStatus">Status</label>
                  <select class="form-control" id="tutorialStatus" required>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <div class="form-check mt-4">
                    <input type="checkbox" class="form-check-input" id="tutorialFeatured" />
                    <label class="form-check-label" for="tutorialFeatured">Featured</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label for="tutorialTags">Tags</label>
              <select class="form-control" id="tutorialTags" multiple style="min-height: 100px"></select>
              <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple tags</small>
            </div>
            <div class="form-group">
              <label for="tutorialCategories">Categories</label>
              <select class="form-control" id="tutorialCategories" multiple style="min-height: 100px"></select>
              <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple categories</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Tutorial</button>
          </div>
        </form>
      </div>
    </div>
  </div>
`;

function initTutorialsPage() {
  let tutorialsTable: { destroy: () => void } | null = null;
  let currentTutorialId: number | null = null;
  let simpleMDE: SimpleMDEInstance | null = null;
  let tags: Array<Record<string, unknown>> = [];
  let categories: Array<Record<string, unknown>> = [];
  let tagsTable: { destroy: () => void } | null = null;
  let categoriesTable: { destroy: () => void } | null = null;
  let currentTagId: number | null = null;
  let currentCategoryId: number | null = null;
  const globalWindow = window as unknown as Record<string, unknown>;

  AdminCommon.init();

  const $ = window.$;

  $('#tutorialModal')?.on('shown.bs.modal', () => {
    if (!simpleMDE && window.SimpleMDE) {
      const SimpleMDEConstructor = window.SimpleMDE as new (options: Record<string, unknown>) => SimpleMDEInstance;
      simpleMDE = new SimpleMDEConstructor({
        element: document.getElementById('tutorialBody'),
        spellChecker: false,
        toolbar: [
          'bold',
          'italic',
          'heading',
          '|',
          'quote',
          'unordered-list',
          'ordered-list',
          '|',
          'link',
          'image',
          '|',
          'preview',
          'side-by-side',
          'fullscreen',
          '|',
          'guide',
        ],
      });
    }
  });

  $('#tutorialModal')?.on('hidden.bs.modal', () => {
    if (simpleMDE) {
      simpleMDE.toTextArea();
      simpleMDE = null;
    }
    resetForm();
  });

  document.getElementById('filterStatus')?.addEventListener('change', loadTutorials);
  document.getElementById('filterFeatured')?.addEventListener('change', loadTutorials);
  document.getElementById('filterCategory')?.addEventListener('change', loadTutorials);
  document.getElementById('filterTag')?.addEventListener('change', loadTutorials);

  const tagNameInput = document.getElementById('tagName') as HTMLInputElement | null;
  const tagSlugInput = document.getElementById('tagSlug') as HTMLInputElement | null;
  if (tagNameInput && tagSlugInput) {
    tagNameInput.addEventListener('input', () => {
      if (!tagSlugInput.value || tagSlugInput.dataset.autoGenerated === 'true') {
        tagSlugInput.value = generateSlug(tagNameInput.value);
        tagSlugInput.dataset.autoGenerated = 'true';
      }
    });
    tagSlugInput.addEventListener('input', () => {
      tagSlugInput.dataset.autoGenerated = 'false';
    });
  }

  const categoryNameInput = document.getElementById('categoryName') as HTMLInputElement | null;
  const categorySlugInput = document.getElementById('categorySlug') as HTMLInputElement | null;
  if (categoryNameInput && categorySlugInput) {
    categoryNameInput.addEventListener('input', () => {
      if (
        !categorySlugInput.value ||
        categorySlugInput.dataset.autoGenerated === 'true'
      ) {
        categorySlugInput.value = generateSlug(categoryNameInput.value);
        categorySlugInput.dataset.autoGenerated = 'true';
      }
    });
    categorySlugInput.addEventListener('input', () => {
      categorySlugInput.dataset.autoGenerated = 'false';
    });
  }

  async function loadTutorials() {
    const tableContainer =
      document.querySelector('.card-body') ||
      document.querySelector('#tutorialsTable')?.parentElement;

    const status = (document.getElementById('filterStatus') as HTMLSelectElement | null)
      ?.value;
    const featured = (document.getElementById('filterFeatured') as HTMLSelectElement | null)
      ?.value;
    const categoryId = (document.getElementById('filterCategory') as HTMLSelectElement | null)
      ?.value;
    const tagId = (document.getElementById('filterTag') as HTMLSelectElement | null)
      ?.value;

    const filters: Record<string, unknown> = {};
    if (status) filters.status = status;
    if (featured !== '') filters.featured = featured;
    if (categoryId) filters.categoryId = categoryId;
    if (tagId) filters.tagId = tagId;

    try {
      if (tableContainer) {
        AdminCommon.showContainerLoader(tableContainer, 'Loading tutorials...');
      }

      const tutorials = (await api.getTutorials(filters)) as Array<Record<string, unknown>>;

      if (tutorialsTable) {
        tutorialsTable.destroy();
        tutorialsTable = null;
      }

      const tbody = document.querySelector('#tutorialsTable tbody');
      if (!tbody) {
        if (tableContainer) AdminCommon.hideContainerLoader(tableContainer);
        return;
      }

      if (Array.isArray(tutorials) && tutorials.length > 0) {
        tbody.innerHTML = tutorials
          .map(
            (t) => `
          <tr>
            <td>${t.id}</td>
            <td>${escapeHtml(String(t.title || ''))}</td>
            <td><span class="badge badge-${t.status === 'PUBLISHED' ? 'success' : 'warning'}">${t.status}</span></td>
            <td>${t.featured ? '<span class="badge badge-info"><i class="fas fa-star"></i> Featured</span>' : '-'}</td>
            <td>${t.viewCount || 0}</td>
            <td>${t.author ? escapeHtml(String((t.author as Record<string, unknown>).email || '')) : 'N/A'}</td>
            <td>${AdminCommon.formatDateOnly(String(t.createdAt || ''))}</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="viewTutorial(${t.id})" title="View Details">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-warning" onclick="editTutorial(${t.id})" title="Edit Tutorial">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteTutorial(${t.id})" title="Delete Tutorial">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `,
          )
          .join('');
      } else {
        tbody.innerHTML = '';
      }

      tutorialsTable = AdminCommon.initDataTable(
        '#tutorialsTable',
        {
          order: [[0, 'desc']],
          pageLength: 25,
          responsive: true,
          language: { emptyTable: 'No tutorials found' },
        },
        'tutorialsTable',
      );

      if (tableContainer) {
        AdminCommon.hideContainerLoader(tableContainer);
      }
    } catch (error) {
      if (tableContainer) {
        AdminCommon.hideContainerLoader(tableContainer);
      }
      AdminCommon.showError(
        `Failed to load tutorials: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        tableContainer as HTMLElement,
      );
      const tbody = document.querySelector('#tutorialsTable tbody');
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="8" class="text-center text-danger">Error loading tutorials</td></tr>';
      }
    }
  }

  async function loadTags() {
    try {
      tags = (await api.getTags()) as Array<Record<string, unknown>>;
      const tagSelect = document.getElementById('tutorialTags') as HTMLSelectElement | null;
      const filterTagSelect = document.getElementById('filterTag') as HTMLSelectElement | null;
      if (tagSelect) {
        tagSelect.innerHTML = tags
          .map(
            (tag) => `<option value="${tag.id}">${escapeHtml(String(tag.name || ''))}</option>`,
          )
          .join('');
      }
      if (filterTagSelect) {
        filterTagSelect.innerHTML =
          '<option value="">All Tags</option>' +
          tags
            .map(
              (tag) => `<option value="${tag.id}">${escapeHtml(String(tag.name || ''))}</option>`,
            )
            .join('');
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  async function loadCategories() {
    try {
      categories = (await api.getCategories()) as Array<Record<string, unknown>>;
      const categorySelect = document.getElementById('tutorialCategories') as HTMLSelectElement | null;
      const filterCategorySelect = document.getElementById('filterCategory') as HTMLSelectElement | null;
      if (categorySelect) {
        categorySelect.innerHTML = categories
          .map(
            (cat) => `<option value="${cat.id}">${escapeHtml(String(cat.name || ''))}</option>`,
          )
          .join('');
      }
      if (filterCategorySelect) {
        filterCategorySelect.innerHTML =
          '<option value="">All Categories</option>' +
          categories
            .map(
              (cat) => `<option value="${cat.id}">${escapeHtml(String(cat.name || ''))}</option>`,
            )
            .join('');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  globalWindow.showCreateTutorialModal = () => {
    currentTutorialId = null;
    const titleEl = document.getElementById('tutorialModalTitle');
    if (titleEl) titleEl.textContent = 'Create New Tutorial';
    resetForm();
    window.$?.('#tutorialModal').modal('show');
  };

  globalWindow.viewTutorial = async (id: number) => {
    try {
      const tutorial = (await api.getTutorial(id)) as Record<string, unknown>;

      let modal = document.getElementById('tutorialDetailsModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tutorialDetailsModal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('role', 'dialog');
        modal.innerHTML = `
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Tutorial Details</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body" id="tutorialDetailsModalBody"></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const modalBody = document.getElementById('tutorialDetailsModalBody');
      if (modalBody) {
        const marked = window.marked;
        const bodyHtml =
          marked && typeof marked.parse === 'function'
            ? marked.parse(String(tutorial.body || ''))
            : escapeHtml(String(tutorial.body || ''));
        modalBody.innerHTML = `
          <div class="tutorial-details">
            <h4>${escapeHtml(String(tutorial.title || ''))}</h4>
            <p><strong>Slug:</strong> ${escapeHtml(String(tutorial.slug || ''))}</p>
            <p><strong>Status:</strong> <span class="badge badge-${tutorial.status === 'PUBLISHED' ? 'success' : 'warning'}">${tutorial.status}</span></p>
            <p><strong>Featured:</strong> ${tutorial.featured ? 'Yes' : 'No'}</p>
            <p><strong>Views:</strong> ${tutorial.viewCount || 0}</p>
            <p><strong>Author:</strong> ${tutorial.author ? escapeHtml(String((tutorial.author as Record<string, unknown>).email || '')) : 'N/A'}</p>
            <p><strong>Created:</strong> ${AdminCommon.formatDateTime(String(tutorial.createdAt || ''))}</p>
            <p><strong>Updated:</strong> ${AdminCommon.formatDateTime(String(tutorial.updatedAt || ''))}</p>
            ${tutorial.excerpt ? `<p><strong>Excerpt:</strong> ${escapeHtml(String(tutorial.excerpt))}</p>` : ''}
            ${tutorial.tags && (tutorial.tags as Array<Record<string, unknown>>).length > 0 ? `<p><strong>Tags:</strong> ${(tutorial.tags as Array<Record<string, unknown>>).map((t) => escapeHtml(String(t.name || ''))).join(', ')}</p>` : ''}
            ${tutorial.categories && (tutorial.categories as Array<Record<string, unknown>>).length > 0 ? `<p><strong>Categories:</strong> ${(tutorial.categories as Array<Record<string, unknown>>).map((c) => escapeHtml(String(c.name || ''))).join(', ')}</p>` : ''}
            <hr>
            <h5>Body:</h5>
            <div class="markdown-body" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 4px;">
              ${bodyHtml}
            </div>
          </div>
        `;
      }

      window.$?.('#tutorialDetailsModal').modal('show');
    } catch (error) {
      AdminCommon.showError(
        `Failed to load tutorial: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.editTutorial = async (id: number) => {
    try {
      currentTutorialId = id;
      const tutorial = (await api.getTutorial(id)) as Record<string, unknown>;

      const titleEl = document.getElementById('tutorialModalTitle');
      if (titleEl) titleEl.textContent = 'Edit Tutorial';
      (document.getElementById('tutorialId') as HTMLInputElement).value = String(
        tutorial.id || '',
      );
      (document.getElementById('tutorialTitle') as HTMLInputElement).value =
        String(tutorial.title || '');
      (document.getElementById('tutorialSlug') as HTMLInputElement).value = String(
        tutorial.slug || '',
      );
      (document.getElementById('tutorialExcerpt') as HTMLTextAreaElement).value =
        String(tutorial.excerpt || '');
      (document.getElementById('tutorialStatus') as HTMLSelectElement).value =
        String(tutorial.status || 'DRAFT');
      (document.getElementById('tutorialFeatured') as HTMLInputElement).checked =
        Boolean(tutorial.featured);

      window.$?.('#tutorialModal').modal('show');
      setTimeout(() => {
        if (simpleMDE) {
          simpleMDE.value(String(tutorial.body || ''));
        }
      }, 300);

      const tagSelect = document.getElementById('tutorialTags') as HTMLSelectElement | null;
      if (tagSelect && tutorial.tags && (tutorial.tags as Array<Record<string, unknown>>).length > 0) {
        Array.from(tagSelect.options).forEach((option) => {
          option.selected = (tutorial.tags as Array<Record<string, unknown>>).some(
            (tag) => tag.id === parseInt(option.value, 10),
          );
        });
      }

      const categorySelect = document.getElementById('tutorialCategories') as HTMLSelectElement | null;
      if (
        categorySelect &&
        tutorial.categories &&
        (tutorial.categories as Array<Record<string, unknown>>).length > 0
      ) {
        Array.from(categorySelect.options).forEach((option) => {
          option.selected = (tutorial.categories as Array<Record<string, unknown>>).some(
            (cat) => cat.id === parseInt(option.value, 10),
          );
        });
      }
    } catch (error) {
      AdminCommon.showError(
        `Failed to load tutorial: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.deleteTutorial = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tutorial? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteTutorial(id);
      AdminCommon.showSuccess('Tutorial deleted successfully');
      loadTutorials();
    } catch (error) {
      AdminCommon.showError(
        `Failed to delete tutorial: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.saveTutorial = async (event: Event) => {
    event.preventDefault();
    const title = (document.getElementById('tutorialTitle') as HTMLInputElement).value.trim();
    const slug = (document.getElementById('tutorialSlug') as HTMLInputElement).value.trim();
    const excerpt = (document.getElementById('tutorialExcerpt') as HTMLTextAreaElement).value.trim();
    const status = (document.getElementById('tutorialStatus') as HTMLSelectElement).value;
    const featured = (document.getElementById('tutorialFeatured') as HTMLInputElement).checked;

    let body = '';
    if (simpleMDE) {
      body = simpleMDE.value();
    } else {
      body = (document.getElementById('tutorialBody') as HTMLTextAreaElement).value;
    }

    if (!title || !body) {
      AdminCommon.showError('Title and body are required');
      return;
    }

    const tagSelect = document.getElementById('tutorialTags') as HTMLSelectElement;
    const categorySelect = document.getElementById('tutorialCategories') as HTMLSelectElement;
    const tagIds = Array.from(tagSelect.selectedOptions).map((opt) =>
      parseInt(opt.value, 10),
    );
    const categoryIds = Array.from(categorySelect.selectedOptions).map((opt) =>
      parseInt(opt.value, 10),
    );

    const tutorialData: Record<string, unknown> = {
      title,
      body,
      excerpt: excerpt || undefined,
      status,
      featured,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    };
    if (slug) tutorialData.slug = slug;

    try {
      if (currentTutorialId) {
        await api.updateTutorial(currentTutorialId, tutorialData);
        AdminCommon.showSuccess('Tutorial updated successfully');
      } else {
        await api.createTutorial(tutorialData);
        AdminCommon.showSuccess('Tutorial created successfully');
      }
      window.$?.('#tutorialModal').modal('hide');
      loadTutorials();
    } catch (error) {
      AdminCommon.showError(
        `Failed to save tutorial: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  function resetForm() {
    const form = document.getElementById('tutorialForm') as HTMLFormElement | null;
    form?.reset();
    (document.getElementById('tutorialId') as HTMLInputElement).value = '';
    (document.getElementById('tutorialTitle') as HTMLInputElement).value = '';
    (document.getElementById('tutorialSlug') as HTMLInputElement).value = '';
    (document.getElementById('tutorialExcerpt') as HTMLTextAreaElement).value = '';
    (document.getElementById('tutorialStatus') as HTMLSelectElement).value = 'DRAFT';
    (document.getElementById('tutorialFeatured') as HTMLInputElement).checked = false;

    const tagSelect = document.getElementById('tutorialTags') as HTMLSelectElement | null;
    if (tagSelect) {
      Array.from(tagSelect.options).forEach((option) => {
        option.selected = false;
      });
    }

    const categorySelect = document.getElementById('tutorialCategories') as HTMLSelectElement | null;
    if (categorySelect) {
      Array.from(categorySelect.options).forEach((option) => {
        option.selected = false;
      });
    }

    if (simpleMDE) {
      simpleMDE.value('');
    } else {
      const bodyEl = document.getElementById('tutorialBody') as HTMLTextAreaElement | null;
      if (bodyEl) bodyEl.value = '';
    }
  }

  function escapeHtml(text: string) {
    if (!text) return '';
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  globalWindow.showTagsManagementModal = () => {
    window.$?.('#tagsManagementModal').modal('show');
    loadTagsTable();
  };

  async function loadTagsTable() {
    const tbody = document.querySelector('#tagsTable tbody');
    if (!tbody) return;
    try {
      const tagsList = (await api.getTags()) as Array<Record<string, unknown>>;
      if (tagsTable) {
        tagsTable.destroy();
        tagsTable = null;
      }
      if (Array.isArray(tagsList) && tagsList.length > 0) {
        tbody.innerHTML = tagsList
          .map(
            (tag) => `
          <tr>
            <td>${tag.id}</td>
            <td>${escapeHtml(String(tag.name || ''))}</td>
            <td>${escapeHtml(String(tag.slug || ''))}</td>
            <td>${AdminCommon.formatDateOnly(String(tag.createdAt || ''))}</td>
            <td>
              <button class="btn btn-sm btn-warning" onclick="editTag(${tag.id})" title="Edit Tag">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteTagItem(${tag.id})" title="Delete Tag">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `,
          )
          .join('');

        tagsTable = AdminCommon.initDataTable(
          '#tagsTable',
          {
            order: [[0, 'desc']],
            pageLength: 25,
            responsive: true,
            language: { emptyTable: 'No tags found' },
          },
          'tagsTable',
        );
      } else {
        tbody.innerHTML =
          '<tr><td colspan="5" class="text-center text-muted">No tags found</td></tr>';
      }
    } catch (error) {
      console.error('Error loading tags table:', error);
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-danger">Error loading tags</td></tr>';
    }
  }

  globalWindow.showCreateTagModal = () => {
    currentTagId = null;
    const titleEl = document.getElementById('tagModalTitle');
    if (titleEl) titleEl.textContent = 'Create New Tag';
    resetTagForm();
    window.$?.('#tagModal').modal('show');
  };

  globalWindow.editTag = async (id: number) => {
    try {
      currentTagId = id;
      const tagList = (await api.getTags()) as Array<Record<string, unknown>>;
      const tagData = tagList.find((t) => t.id === id);
      if (!tagData) {
        AdminCommon.showError('Tag not found');
        return;
      }
      const titleEl = document.getElementById('tagModalTitle');
      if (titleEl) titleEl.textContent = 'Edit Tag';
      (document.getElementById('tagId') as HTMLInputElement).value = String(tagData.id || '');
      (document.getElementById('tagName') as HTMLInputElement).value = String(tagData.name || '');
      (document.getElementById('tagSlug') as HTMLInputElement).value = String(tagData.slug || '');
      window.$?.('#tagModal').modal('show');
    } catch (error) {
      AdminCommon.showError(
        `Failed to load tag: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.deleteTagItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteTag(id);
      AdminCommon.showSuccess('Tag deleted successfully');
      loadTagsTable();
      loadTags();
    } catch (error) {
      AdminCommon.showError(
        `Failed to delete tag: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.saveTag = async (event: Event) => {
    event.preventDefault();
    const name = (document.getElementById('tagName') as HTMLInputElement).value.trim();
    const slug = (document.getElementById('tagSlug') as HTMLInputElement).value.trim();
    if (!name) {
      AdminCommon.showError('Name is required');
      return;
    }
    try {
      if (currentTagId) {
        const tagData: Record<string, unknown> = { name };
        if (slug) tagData.slug = slug;
        await api.updateTag(currentTagId, tagData);
        AdminCommon.showSuccess('Tag updated successfully');
      } else {
        const tagData = { name };
        await api.createTag(tagData);
        AdminCommon.showSuccess('Tag created successfully');
      }
      window.$?.('#tagModal').modal('hide');
      loadTagsTable();
      loadTags();
    } catch (error) {
      AdminCommon.showError(
        `Failed to save tag: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  function resetTagForm() {
    const form = document.getElementById('tagForm') as HTMLFormElement | null;
    form?.reset();
    (document.getElementById('tagId') as HTMLInputElement).value = '';
    (document.getElementById('tagName') as HTMLInputElement).value = '';
    (document.getElementById('tagSlug') as HTMLInputElement).value = '';
  }

  globalWindow.showCategoriesManagementModal = () => {
    window.$?.('#categoriesManagementModal').modal('show');
    loadCategoriesTable();
  };

  async function loadCategoriesTable() {
    const tbody = document.querySelector('#categoriesTable tbody');
    if (!tbody) return;
    try {
      const categoriesList = (await api.getCategories()) as Array<Record<string, unknown>>;
      if (categoriesTable) {
        categoriesTable.destroy();
        categoriesTable = null;
      }
      if (Array.isArray(categoriesList) && categoriesList.length > 0) {
        tbody.innerHTML = categoriesList
          .map(
            (cat) => `
          <tr>
            <td>${cat.id}</td>
            <td>${escapeHtml(String(cat.name || ''))}</td>
            <td>${escapeHtml(String(cat.slug || ''))}</td>
            <td>${cat.description ? escapeHtml(String(cat.description).substring(0, 50)) + (String(cat.description).length > 50 ? '...' : '') : '-'}</td>
            <td>${AdminCommon.formatDateOnly(String(cat.createdAt || ''))}</td>
            <td>
              <button class="btn btn-sm btn-warning" onclick="editCategory(${cat.id})" title="Edit Category">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteCategoryItem(${cat.id})" title="Delete Category">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `,
          )
          .join('');

        categoriesTable = AdminCommon.initDataTable(
          '#categoriesTable',
          {
            order: [[0, 'desc']],
            pageLength: 25,
            responsive: true,
            language: { emptyTable: 'No categories found' },
          },
          'categoriesTable',
        );
      } else {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-center text-muted">No categories found</td></tr>';
      }
    } catch (error) {
      console.error('Error loading categories table:', error);
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center text-danger">Error loading categories</td></tr>';
    }
  }

  globalWindow.showCreateCategoryModal = () => {
    currentCategoryId = null;
    const titleEl = document.getElementById('categoryModalTitle');
    if (titleEl) titleEl.textContent = 'Create New Category';
    resetCategoryForm();
    window.$?.('#categoryModal').modal('show');
  };

  globalWindow.editCategory = async (id: number) => {
    try {
      currentCategoryId = id;
      const categoriesList = (await api.getCategories()) as Array<Record<string, unknown>>;
      const categoryData = categoriesList.find((c) => c.id === id);
      if (!categoryData) {
        AdminCommon.showError('Category not found');
        return;
      }
      const titleEl = document.getElementById('categoryModalTitle');
      if (titleEl) titleEl.textContent = 'Edit Category';
      (document.getElementById('categoryId') as HTMLInputElement).value = String(categoryData.id || '');
      (document.getElementById('categoryName') as HTMLInputElement).value = String(categoryData.name || '');
      (document.getElementById('categoryDescription') as HTMLTextAreaElement).value = String(categoryData.description || '');
      (document.getElementById('categorySlug') as HTMLInputElement).value = String(categoryData.slug || '');
      window.$?.('#categoryModal').modal('show');
    } catch (error) {
      AdminCommon.showError(
        `Failed to load category: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.deleteCategoryItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteCategory(id);
      AdminCommon.showSuccess('Category deleted successfully');
      loadCategoriesTable();
      loadCategories();
    } catch (error) {
      AdminCommon.showError(
        `Failed to delete category: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.saveCategory = async (event: Event) => {
    event.preventDefault();
    const name = (document.getElementById('categoryName') as HTMLInputElement).value.trim();
    const description = (document.getElementById('categoryDescription') as HTMLTextAreaElement).value.trim();
    const slug = (document.getElementById('categorySlug') as HTMLInputElement).value.trim();
    if (!name) {
      AdminCommon.showError('Name is required');
      return;
    }
    try {
      if (currentCategoryId) {
        const categoryData: Record<string, unknown> = { name };
        if (description) categoryData.description = description;
        if (slug) categoryData.slug = slug;
        await api.updateCategory(currentCategoryId, categoryData);
        AdminCommon.showSuccess('Category updated successfully');
      } else {
        const categoryData: Record<string, unknown> = { name };
        if (description) categoryData.description = description;
        await api.createCategory(categoryData);
        AdminCommon.showSuccess('Category created successfully');
      }
      window.$?.('#categoryModal').modal('hide');
      loadCategoriesTable();
      loadCategories();
    } catch (error) {
      AdminCommon.showError(
        `Failed to save category: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  function resetCategoryForm() {
    const form = document.getElementById('categoryForm') as HTMLFormElement | null;
    form?.reset();
    (document.getElementById('categoryId') as HTMLInputElement).value = '';
    (document.getElementById('categoryName') as HTMLInputElement).value = '';
    (document.getElementById('categoryDescription') as HTMLTextAreaElement).value = '';
    (document.getElementById('categorySlug') as HTMLInputElement).value = '';
  }

  loadTags();
  loadCategories();
  loadTutorials();

  return () => {
    if (tutorialsTable) {
      tutorialsTable.destroy();
      tutorialsTable = null;
    }
    if (tagsTable) {
      tagsTable.destroy();
      tagsTable = null;
    }
    if (categoriesTable) {
      categoriesTable.destroy();
      categoriesTable = null;
    }
    delete globalWindow.showCreateTutorialModal;
  };
}

export default function TutorialsPage() {
  return <LegacyPage html={tutorialsHtml} onMount={initTutorialsPage} />;
}
