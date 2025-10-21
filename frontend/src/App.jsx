import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// --- Existing imports ---
const AuthenticatedLayout = lazy(() => import('./layout/AuthenticatedLayout'));
const Login = lazy(() => import('./features/auth/Login'));
const HomePage = lazy(() => import('./features/home/HomePage'));
const UserManagementPage = lazy(() => import('./features/admin/user-management/index.jsx'));
const MyGroupPage = lazy(() => import('./features/student/my-group/index.jsx'));
const FindGroupPage = lazy(() => import('./features/student/find-group/index.jsx'));
const GroupAdminPage = lazy(() => import('./features/admin/group-management/index.jsx'));
const ThesisPlanManagementPage = lazy(() => import('./features/admin/thesis-plan-management/index.jsx'));
const PlanFormPage = lazy(() => import('./features/admin/thesis-plan-management/PlanFormPage.jsx'));
// --- END Existing imports ---

// *** ADD NEW IMPORTS FOR TEMPLATES ***
const TemplateManagementPage = lazy(() => import('./features/admin/thesis-plan-template-management/index.jsx'));
const TemplateFormPage = lazy(() => import('./features/admin/thesis-plan-template-management/TemplateFormPage.jsx'));
// ************************************

const PlaceholderPage = ({ title }) => (
    <div className="p-4 bg-white rounded-lg shadow dark:bg-card">
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
                {/* Login Route */}
                <Route
                    path="/login"
                    element={<PublicRoute><Login /></PublicRoute>}
                />

                {/* Authenticated Routes */}
                <Route
                    path="/"
                    element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}
                >
                    {/* General Routes */}
                    <Route index element={<HomePage />} />
                    <Route path="notifications" element={<PlaceholderPage title="Thông báo" />} />
                    <Route path="history" element={<PlaceholderPage title="Lịch sử" />} />
                    <Route path="starred" element={<PlaceholderPage title="Đã lưu" />} />
                    <Route path="students" element={<PlaceholderPage title="Sinh viên" />} />
                    <Route path="projects/topics" element={<PlaceholderPage title="Đề tài" />} />
                    <Route path="settings/account" element={<PlaceholderPage title="Tài khoản" />} />
                    <Route path="settings/appearance" element={<PlaceholderPage title="Giao diện" />} />

                    {/* Student Routes */}
                    {user && user.vaitro.TEN_VAITRO === 'Sinh viên' && (
                        <>
                            <Route path="projects/my-group" element={<MyGroupPage />} />
                            <Route path="projects/find-group" element={<FindGroupPage />} />
                        </>
                    )}

                    {/* Admin Routes */}
                    {user && user.vaitro.TEN_VAITRO === 'Admin' && (
                        <>
                            <Route path="admin/users" element={<UserManagementPage />} />
                            <Route path="admin/groups" element={<GroupAdminPage />} />
                            {/* Thesis Plan Routes */}
                            <Route path="admin/thesis-plans" element={<ThesisPlanManagementPage />} />
                            <Route path="admin/thesis-plans/create" element={<PlanFormPage />} />
                            <Route path="admin/thesis-plans/:planId/edit" element={<PlanFormPage />} />
                            {/* *** ADD NEW TEMPLATE ROUTES *** */}
                            <Route path="admin/templates" element={<TemplateManagementPage />} />
                            <Route path="admin/templates/create" element={<TemplateFormPage />} />
                            <Route path="admin/templates/:templateId/edit" element={<TemplateFormPage />} />
                            {/* ******************************* */}
                        </>
                    )}
                </Route>

                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

export default App;