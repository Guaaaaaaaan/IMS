import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { StoreProvider } from './data/store';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './components/AuthGuard';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import WarehouseList from './pages/WarehouseList';
import InventoryBalances from './pages/InventoryBalances';
import InventoryLedger from './pages/InventoryLedger';
import SKUDetail from './pages/SKUDetail';
import DocumentList from './pages/DocumentList';
import DocumentForm from './pages/DocumentForm';
import AuditLogs from './pages/AuditLogs';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      
                      <Route path="/products" element={<ProductList />} />
                      <Route path="/products/new" element={<ProductForm />} />
                      <Route path="/products/:id/edit" element={<ProductForm />} />
                      
                      <Route path="/warehouses" element={<WarehouseList />} />
                      
                      <Route path="/inventory/balances" element={<InventoryBalances />} />
                      <Route path="/inventory/ledger" element={<InventoryLedger />} />
                      <Route path="/inventory/product/:id" element={<SKUDetail />} />
                      
                      {/* Redirect /documents to /documents/receipts */}
                      <Route path="/documents" element={<Navigate to="/documents/receipts" replace />} />
                      <Route path="/documents/:type" element={<DocumentList />} />
                      <Route path="/documents/:type/new" element={<DocumentForm />} />
                      <Route path="/documents/:type/:id" element={<DocumentForm />} />

                      <Route path="/audit-logs" element={<AuditLogs />} />
                      <Route path="/users" element={<UserManagement />} />

                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </Layout>
                </AuthGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}
