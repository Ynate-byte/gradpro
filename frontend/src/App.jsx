import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// CẬP NHẬT ĐƯỜNG DẪN IMPORT
const AuthenticatedLayout = lazy(() => import('./layout/AuthenticatedLayout'));
const Login = lazy(() => import('./features/auth/Login'));
const HomePage = lazy(() => import('./features/home/HomePage'));
// SỬA LỖI: Chỉ định rõ file index.jsx
const UserManagementPage = lazy(() => import('./features/admin/user-management/index.jsx'));

const PlaceholderPage = ({ title }) => (
    <div className="p-4 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold">Đây là trang: {title}</h1>
        <p>Nội dung cho trang này sẽ được phát triển trong tương lai.</p>
    </div>
);

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function PublicRoute({ children }) {
    const { isAuthenticated } = useAuth();
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }
    return children;
}

function App() {
    const { user } = useAuth();

    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Đang tải ứng dụng...</div>}>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <AuthenticatedLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<HomePage />} />
                    <Route path="notifications" element={<PlaceholderPage title="Thông báo" />} />
                    <Route path="history" element={<PlaceholderPage title="Lịch sử" />} />
                    <Route path="starred" element={<PlaceholderPage title="Đã lưu" />} />
                    <Route path="students" element={<PlaceholderPage title="Sinh viên" />} />
                    <Route path="projects/topics" element={<PlaceholderPage title="Đề tài" />} />
                    <Route path="projects/my-group" element={<PlaceholderPage title="Nhóm của tôi" />} />
                    <Route path="settings/account" element={<PlaceholderPage title="Tài khoản" />} />
                    <Route path="settings/appearance" element={<PlaceholderPage title="Giao diện" />} />
                    
                    {user && user.vaitro.TEN_VAITRO === 'Admin' && (
                         <Route path="admin/users" element={<UserManagementPage />} />
                    )}
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

export default App;