import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import $ from 'jquery';
import './styles/admin.css';
import 'admin-lte/dist/css/adminlte.min.css';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';
import './lib/api';
import './lib/auth';
import './lib/adminCommon';
import './lib/timezone';

const windowWithJquery = window as Window & {
  $?: typeof $;
  jQuery?: typeof $;
};

windowWithJquery.$ = $;
windowWithJquery.jQuery = $;

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const renderApp = () => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter basename="/admin">
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
};

const loadVendors = async () => {
  await import('bootstrap/dist/js/bootstrap.bundle');
  await import('admin-lte/dist/js/adminlte');
  const dataTablesCore = await import('datatables.net');
  const dataTablesCoreFactory =
    (dataTablesCore as { default?: unknown }).default ?? dataTablesCore;
  if (typeof dataTablesCoreFactory === 'function') {
    dataTablesCoreFactory(undefined, $);
  } else {
    console.warn('[Admin UI] DataTables core factory not found');
  }

  const dataTablesModule = await import('datatables.net-bs4');
  const dataTablesFactory =
    (dataTablesModule as { default?: unknown }).default ?? dataTablesModule;
  if (typeof dataTablesFactory === 'function') {
    dataTablesFactory(undefined, $);
  } else {
    console.warn('[Admin UI] DataTables factory not found');
  }
};

loadVendors()
  .catch((error) => {
    console.error('[Admin UI] Failed to load vendor libraries:', error);
  })
  .finally(() => {
    renderApp();
  });
