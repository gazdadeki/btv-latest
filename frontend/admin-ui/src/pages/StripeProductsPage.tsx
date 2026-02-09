import React from 'react';
import LegacyPage from '@/components/LegacyPage';
import { api } from '@/lib/api';
import { AdminCommon } from '@/lib/adminCommon';

interface StripeProduct {
  id: number;
  name: string;
  description?: string;
  type: 'SUBSCRIPTION' | 'COIN_PACK';
  isActive: boolean;
  isArchived: boolean;
  syncStatus?: string;
  productData: {
    price: number;
    coins?: number;
    billingPeriod?: string;
    tier?: string;
  };
  stripeProductId?: string;
  stripePriceId?: string;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

const stripeProductsHtml = `
  <div class="content-wrapper">
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Stripe Products</h1>
          </div>
          <div class="col-sm-6">
            <button type="button" class="btn btn-success float-right" onclick="syncFromStripe()">
              <i class="fas fa-sync"></i> Sync from Stripe
            </button>
          </div>
        </div>
      </div>
    </div>

    <section class="content">
      <div class="container-fluid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Product Management</h3>
            <div class="card-tools">
              <div class="btn-group mr-2">
                <select class="form-control form-control-sm" id="productFilter" onchange="applyProductFilter()">
                  <option value="active">Active Only</option>
                  <option value="all">All Products</option>
                </select>
              </div>
              <button type="button" class="btn btn-primary btn-sm" onclick="showCreateProductModal()">
                <i class="fas fa-plus"></i> Create Product
              </button>
            </div>
          </div>
          <div class="card-body">
            <table id="productsTable" class="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Sync Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div class="modal fade" id="productModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="productModalTitle">Create Product</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form id="productForm">
            <input type="hidden" id="productId" name="id">
            <div class="form-group">
              <label for="productName">Name *</label>
              <input type="text" class="form-control" id="productName" name="name" required>
            </div>
            <div class="form-group">
              <label for="productDescription">Description</label>
              <textarea class="form-control" id="productDescription" name="description" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label for="productType">Type *</label>
              <select class="form-control" id="productType" name="type" required>
                <option value="">Select Type</option>
                <option value="SUBSCRIPTION">Subscription</option>
                <option value="COIN_PACK">Coin Pack</option>
              </select>
            </div>
            <div id="subscriptionFields" style="display: none;">
              <div class="form-group">
                <label for="billingPeriod">Billing Period *</label>
                <select class="form-control" id="billingPeriod" name="billingPeriod">
                  <option value="MONTHLY">Monthly</option>
                  <option value="SIX_MONTHS">6 Months</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div class="form-group">
                <label for="tier">Tier</label>
                <input type="text" class="form-control" id="tier" name="tier" value="GOLD" readonly>
              </div>
            </div>
            <div id="coinPackFields" style="display: none;">
              <div class="form-group">
                <label for="coins">Coins *</label>
                <input type="number" class="form-control" id="coins" name="coins" min="1">
              </div>
            </div>
            <div class="form-group">
              <label for="productPrice">Price (USD) *</label>
              <input type="number" class="form-control" id="productPrice" name="price" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label for="displayOrder">Display Order</label>
              <input type="number" class="form-control" id="displayOrder" name="displayOrder" value="0" min="0">
            </div>
            <div class="form-group">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" id="productIsActive" name="isActive" checked>
                <label class="form-check-label" for="productIsActive">Active</label>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="saveProduct()">Save Product</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="archiveModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Archive Product</h5>
          <button type="button" class="close" data-dismiss="modal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to archive this product? It will be set to inactive in Stripe.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-danger" onclick="confirmArchive()">Archive</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="main-footer">
    <strong>Copyright &copy; 2025 BaltazarTV.</strong>
  </footer>
`;

function initStripeProductsPage() {
  let productsTable: { destroy: () => void } | null = null;
  let currentProductId: number | null = null;
  const globalWindow = window as unknown as Record<string, unknown>;

  AdminCommon.init();

  const savedFilter = localStorage.getItem('stripeProductsFilter');
  if (savedFilter) {
    const filterEl = document.getElementById('productFilter') as HTMLSelectElement | null;
    if (filterEl) filterEl.value = savedFilter;
  }

  const productTypeEl = document.getElementById('productType') as HTMLSelectElement | null;
  productTypeEl?.addEventListener('change', function () {
    const type = (this as HTMLSelectElement).value;
    const subscriptionFields = document.getElementById('subscriptionFields');
    const coinPackFields = document.getElementById('coinPackFields');
    const billingPeriod = document.getElementById('billingPeriod') as HTMLSelectElement | null;
    const coins = document.getElementById('coins') as HTMLInputElement | null;

    if (type === 'SUBSCRIPTION') {
      if (subscriptionFields) subscriptionFields.style.display = 'block';
      if (coinPackFields) coinPackFields.style.display = 'none';
      if (billingPeriod) billingPeriod.required = true;
      if (coins) coins.required = false;
    } else if (type === 'COIN_PACK') {
      if (subscriptionFields) subscriptionFields.style.display = 'none';
      if (coinPackFields) coinPackFields.style.display = 'block';
      if (billingPeriod) billingPeriod.required = false;
      if (coins) coins.required = true;
    } else {
      if (subscriptionFields) subscriptionFields.style.display = 'none';
      if (coinPackFields) coinPackFields.style.display = 'none';
      if (billingPeriod) billingPeriod.required = false;
      if (coins) coins.required = false;
    }
  });

  async function loadProducts() {
    const tableContainer =
      document.querySelector('.card-body') ||
      document.querySelector('#productsTable')?.parentElement;
    try {
      if (tableContainer) {
        AdminCommon.showContainerLoader(tableContainer, 'Loading products...');
      }

      const response = (await api.getStripeProducts()) as { products?: StripeProduct[] };
      let products = response.products || [];
      const filterValue = (document.getElementById('productFilter') as HTMLSelectElement | null)
        ?.value;
      if (filterValue === 'active') {
        products = products.filter((p) => p.isActive && !p.isArchived);
      }

      const tbody = document.querySelector('#productsTable tbody');

      if (productsTable) {
        productsTable.destroy();
      }

      if (tbody && products && products.length > 0) {
        tbody.innerHTML = products
          .map((p) => {
            const typeBadge =
              p.type === 'SUBSCRIPTION'
                ? '<span class="badge badge-info">Subscription</span>'
                : '<span class="badge badge-success">Coin Pack</span>';

            const statusBadge =
              p.isActive && !p.isArchived
                ? '<span class="badge badge-success">Active</span>'
                : '<span class="badge badge-secondary">Inactive</span>';

            const syncBadge =
              p.syncStatus === 'synced'
                ? '<span class="badge badge-success">Synced</span>'
                : '<span class="badge badge-warning">Out of Sync</span>';

            let priceDisplay = `$${p.productData.price.toFixed(2)}`;
            if (p.type === 'COIN_PACK' && p.productData.coins) {
              priceDisplay += ` (${p.productData.coins} coins)`;
            } else if (p.type === 'SUBSCRIPTION' && p.productData.billingPeriod) {
              const periodMap: Record<string, string> = {
                MONTHLY: '/month',
                SIX_MONTHS: '/6 months',
                YEARLY: '/year',
              };
              priceDisplay += periodMap[p.productData.billingPeriod] || '';
            }

            return `
          <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${typeBadge}</td>
            <td>${priceDisplay}</td>
            <td>${statusBadge}</td>
            <td>${syncBadge}</td>
            <td>${AdminCommon.formatDate(p.createdAt)}</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="viewProduct(${p.id})" title="View"><i class="fas fa-eye"></i></button>
              <button class="btn btn-sm btn-primary" onclick="editProduct(${p.id})" title="Edit"><i class="fas fa-edit"></i></button>
              ${p.syncStatus === 'out_of_sync' ? `<button class="btn btn-sm btn-warning" onclick="syncProduct(${p.id})" title="Sync"><i class="fas fa-sync"></i></button>` : ''}
              ${!p.isArchived ? `<button class="btn btn-sm btn-danger" onclick="archiveProduct(${p.id})" title="Archive"><i class="fas fa-archive"></i></button>` : ''}
            </td>
          </tr>
        `;
          })
          .join('');

        productsTable = AdminCommon.initDataTable(
          '#productsTable',
          { order: [[0, 'desc']] },
          'productsTable',
        );
      } else if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="8" class="text-center text-muted">No products found</td></tr>';
      }

      if (tableContainer) {
        AdminCommon.hideContainerLoader(tableContainer);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      if (tableContainer) {
        AdminCommon.hideContainerLoader(tableContainer);
      }
      const tbody = document.querySelector('#productsTable tbody');
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="8" class="text-center text-danger">Failed to load products</td></tr>';
      }
      AdminCommon.showError(
        `Failed to load products: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  globalWindow.showCreateProductModal = () => {
    currentProductId = null;
    const titleEl = document.getElementById('productModalTitle');
    if (titleEl) titleEl.textContent = 'Create Product';
    const form = document.getElementById('productForm') as HTMLFormElement | null;
    form?.reset();
    const productIdEl = document.getElementById('productId') as HTMLInputElement | null;
    if (productIdEl) productIdEl.value = '';
    const subscriptionFields = document.getElementById('subscriptionFields');
    const coinPackFields = document.getElementById('coinPackFields');
    if (subscriptionFields) subscriptionFields.style.display = 'none';
    if (coinPackFields) coinPackFields.style.display = 'none';
    const activeEl = document.getElementById('productIsActive') as HTMLInputElement | null;
    if (activeEl) activeEl.checked = true;
    window.$?.('#productModal').modal('show');
  };

  globalWindow.editProduct = async (productId: number) => {
    try {
      const products = (await api.getStripeProducts()) as { products?: StripeProduct[] };
      const product = products.products?.find((p) => p.id === productId);
      if (!product) {
        AdminCommon.showError('Product not found');
        return;
      }

      currentProductId = productId;
      const titleEl = document.getElementById('productModalTitle');
      if (titleEl) titleEl.textContent = 'Edit Product';
      (document.getElementById('productId') as HTMLInputElement).value = String(
        product.id,
      );
      (document.getElementById('productName') as HTMLInputElement).value =
        product.name;
      (document.getElementById('productDescription') as HTMLTextAreaElement).value =
        product.description || '';
      (document.getElementById('productType') as HTMLSelectElement).value = product.type;
      (document.getElementById('productPrice') as HTMLInputElement).value = String(
        product.productData.price,
      );
      (document.getElementById('displayOrder') as HTMLInputElement).value = String(
        product.displayOrder || 0,
      );
      (document.getElementById('productIsActive') as HTMLInputElement).checked =
        product.isActive && !product.isArchived;

      document.getElementById('productType')?.dispatchEvent(new Event('change'));

      if (product.type === 'SUBSCRIPTION') {
        (document.getElementById('billingPeriod') as HTMLSelectElement).value =
          product.productData.billingPeriod || 'MONTHLY';
        (document.getElementById('tier') as HTMLInputElement).value =
          product.productData.tier || 'GOLD';
      } else if (product.type === 'COIN_PACK') {
        (document.getElementById('coins') as HTMLInputElement).value = String(
          product.productData.coins || '',
        );
      }

      window.$?.('#productModal').modal('show');
    } catch (error) {
      console.error('Failed to load product:', error);
      AdminCommon.showError(
        `Failed to load product: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.viewProduct = async (productId: number) => {
    try {
      const products = (await api.getStripeProducts()) as { products?: StripeProduct[] };
      const product = products.products?.find((p) => p.id === productId);

      if (!product) {
        AdminCommon.showError('Product not found');
        return;
      }

      let details = `
        <strong>ID:</strong> ${product.id}<br>
        <strong>Name:</strong> ${product.name}<br>
        <strong>Description:</strong> ${product.description || 'N/A'}<br>
        <strong>Type:</strong> ${product.type}<br>
        <strong>Price:</strong> $${product.productData.price.toFixed(2)}<br>
        <strong>Status:</strong> ${product.isActive && !product.isArchived ? 'Active' : 'Inactive'}<br>
        <strong>Sync Status:</strong> ${product.syncStatus || 'Unknown'}<br>
        <strong>Stripe Product ID:</strong> ${product.stripeProductId || 'N/A'}<br>
        <strong>Stripe Price ID:</strong> ${product.stripePriceId || 'N/A'}<br>
        <strong>Created:</strong> ${AdminCommon.formatDate(product.createdAt)}<br>
        <strong>Updated:</strong> ${AdminCommon.formatDate(product.updatedAt)}<br>
      `;

      if (product.type === 'SUBSCRIPTION') {
        details += `<strong>Billing Period:</strong> ${product.productData.billingPeriod || 'N/A'}<br>`;
        details += `<strong>Tier:</strong> ${product.productData.tier || 'N/A'}<br>`;
      } else if (product.type === 'COIN_PACK') {
        details += `<strong>Coins:</strong> ${product.productData.coins || 'N/A'}<br>`;
      }

      AdminCommon.showInfo('Product Details', details);
    } catch (error) {
      console.error('Failed to load product:', error);
      AdminCommon.showError(
        `Failed to load product: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.saveProduct = async () => {
    const form = document.getElementById('productForm') as HTMLFormElement | null;
    if (!form?.checkValidity()) {
      form?.reportValidity();
      return;
    }

    try {
      const formData: Record<string, unknown> = {
        name: (document.getElementById('productName') as HTMLInputElement).value,
        description:
          (document.getElementById('productDescription') as HTMLTextAreaElement).value ||
          undefined,
        type: (document.getElementById('productType') as HTMLSelectElement).value,
        price: parseFloat(
          (document.getElementById('productPrice') as HTMLInputElement).value,
        ),
        displayOrder:
          parseInt((document.getElementById('displayOrder') as HTMLInputElement).value, 10) || 0,
        isActive: (document.getElementById('productIsActive') as HTMLInputElement).checked,
      };

      const productData: Record<string, unknown> = {
        price: formData.price,
      };

      if (formData.type === 'SUBSCRIPTION') {
        productData.billingPeriod = (document.getElementById('billingPeriod') as HTMLSelectElement)
          .value;
        productData.tier = (document.getElementById('tier') as HTMLInputElement).value || 'GOLD';
      } else if (formData.type === 'COIN_PACK') {
        const coins = parseInt(
          (document.getElementById('coins') as HTMLInputElement).value,
          10,
        );
        if (!coins || coins <= 0) {
          AdminCommon.showError('Coins must be a positive number');
          return;
        }
        productData.coins = coins;
      }

      formData.productData = productData;

      if (currentProductId) {
        await api.updateStripeProduct(currentProductId, formData);
        AdminCommon.showSuccess('Product updated successfully');
      } else {
        await api.createStripeProduct(formData);
        AdminCommon.showSuccess('Product created successfully');
      }

      window.$?.('#productModal').modal('hide');
      loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      AdminCommon.showError(
        `Failed to save product: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.archiveProduct = (productId: number) => {
    currentProductId = productId;
    window.$?.('#archiveModal').modal('show');
  };

  globalWindow.confirmArchive = async () => {
    if (!currentProductId) return;
    try {
      await api.archiveStripeProduct(currentProductId);
      AdminCommon.showSuccess('Product archived successfully');
      window.$?.('#archiveModal').modal('hide');
      loadProducts();
    } catch (error) {
      console.error('Failed to archive product:', error);
      AdminCommon.showError(
        `Failed to archive product: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.syncProduct = async (productId: number) => {
    try {
      await api.syncStripeProduct(productId);
      AdminCommon.showSuccess('Product synced successfully');
      loadProducts();
    } catch (error) {
      console.error('Failed to sync product:', error);
      AdminCommon.showError(
        `Failed to sync product: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  globalWindow.applyProductFilter = () => {
    const filterValue = (document.getElementById('productFilter') as HTMLSelectElement | null)
      ?.value;
    if (filterValue) {
      localStorage.setItem('stripeProductsFilter', filterValue);
    }
    loadProducts();
  };

  globalWindow.syncFromStripe = async () => {
    if (
      !confirm(
        'This will sync all active products from Stripe to the local database. Continue?',
      )
    ) {
      return;
    }

    try {
      AdminCommon.showFullScreenLoader('Syncing products from Stripe...');
      const result = (await api.syncProductsFromStripe()) as {
        created: number;
        updated: number;
        errors?: Array<unknown>;
      };
      AdminCommon.hideFullScreenLoader();

      let message = `Sync completed: ${result.created} created, ${result.updated} updated`;
      if (result.errors && result.errors.length > 0) {
        message += `, ${result.errors.length} error(s)`;
        console.error('Sync errors:', result.errors);
      }

      AdminCommon.showSuccess(message);
      if (result.errors && result.errors.length > 0) {
        console.warn('Sync errors:', result.errors);
      }
      loadProducts();
    } catch (error) {
      AdminCommon.hideFullScreenLoader();
      console.error('Failed to sync from Stripe:', error);
      AdminCommon.showError(
        `Failed to sync from Stripe: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  loadProducts();

  return () => {
    if (productsTable) {
      productsTable.destroy();
      productsTable = null;
    }
    delete globalWindow.showCreateProductModal;
  };
}

export default function StripeProductsPage() {
  return <LegacyPage html={stripeProductsHtml} onMount={initStripeProductsPage} />;
}
