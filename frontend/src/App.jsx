import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// --- Import các components Layout và Auth ---
const AuthenticatedLayout = lazy(() => import('./layout/AuthenticatedLayout'));
const Login = lazy(() => import('./features/auth/Login'));

// --- Import các components chung ---
const HomePage = lazy(() => import('./features/home/HomePage'));
const NewsManagementPage = lazy(() => import('./features/news-management/index.jsx'));
const NewsDetail = lazy(() => import('./features/news-management/NewsDetail'));

// --- Import các components Sinh viên ---
const MyGroupPage = lazy(() => import('./features/student/my-group/index.jsx'));
const FindGroupPage = lazy(() => import('./features/student/find-group/index.jsx'));
const MyPlansPage = lazy(() => import('./features/student/my-plans/index.jsx'));

// --- Import các components Quản trị ---
const UserManagementPage = lazy(() => import('./features/admin/user-management/index.jsx'));
const GroupAdminPage = lazy(() => import('./features/admin/group-management/index.jsx'));
const ThesisPlanManagementPage = lazy(() => import('./features/admin/thesis-plan-management/index.jsx'));
const PlanFormPage = lazy(() => import('./features/admin/thesis-plan-management/PlanFormPage.jsx'));
const PlanParticipantPage = lazy(() => import('./features/admin/thesis-plan-management/PlanParticipantPage.jsx'));
const TemplateManagementPage = lazy(() => import('./features/admin/thesis-plan-template-management/index.jsx'));
const TemplateFormPage = lazy(() => import('./features/admin/thesis-plan-template-management/TemplateFormPage.jsx'));

// Component placeholder cho các trang chưa có nội dung
const PlaceholderPage = ({ title }) => (
  <div className="p-4 bg-white rounded-lg shadow dark:bg-card">
    <h1 className="text-2xl font-bold">Đây là trang: {title}</h1>
    <p>Nội dung cho trang này sẽ được phát triển trong tương lai.</p>
  </div>
);

// Component Route bảo vệ (yêu cầu đăng nhập)
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Component Route công khai (chuyển hướng nếu đã đăng nhập)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Component chính định tuyến ứng dụng
function App() {
  const { user } = useAuth();

  // ----- THÊM MỚI: Logic kiểm tra quyền Admin -----
  const userRoleName = user?.vaitro?.TEN_VAITRO;
  const userPositionName = user?.giangvien?.CHUCVU;

  const isAdmin = userRoleName === 'Admin';
  const isTruongKhoa = userRoleName === 'Trưởng khoa' || userPositionName === 'Trưởng khoa';
  const isGiaoVu = userRoleName === 'Giáo vụ' || userPositionName === 'Giáo vụ';

  // Admin, Trưởng khoa, Giáo vụ đều có thể xem các route /admin
  const canViewAdminRoutes = isAdmin || isTruongKhoa || isGiaoVu;
  // ----- KẾT THÚC THÊM MỚI -----


  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          Đang tải ứng dụng...
        </div>
      }
    >
      <Routes>
        {/* Route Đăng nhập */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Các Routes yêu cầu xác thực */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }
        >
          {/* Các Routes chung */}
          <Route index element={<HomePage />} />
          <Route path="notifications" element={<PlaceholderPage title="Thông báo" />} />
          <Route path="history" element={<PlaceholderPage title="Lịch sử" />} />
          <Route path="starred" element={<PlaceholderPage title="Đã lưu" />} />
          <Route path="students" element={<PlaceholderPage title="Sinh viên" />} />
          <Route path="projects/topics" element={<PlaceholderPage title="Đề tài" />} />
          <Route path="settings/account" element={<PlaceholderPage title="Tài khoản" />} />
          <Route path="settings/appearance" element={<PlaceholderPage title="Giao diện" />} />

          {/* Các Routes chung tin tức */}
          <Route path="news" element={<NewsManagementPage />} />
          <Route path="news/:id" element={<NewsDetail />} />

          {/* Routes dành cho Sinh viên */}
          {user && user.vaitro.TEN_VAITRO === 'Sinh viên' && (
            <>
              <Route path="projects/my-plans" element={<MyPlansPage />} />
              <Route path="projects/my-group" element={<MyGroupPage />} />
              <Route path="projects/find-group" element={<FindGroupPage />} />
            </>
          )}

          {/* ----- SỬA ĐỔI: Dùng canViewAdminRoutes ----- */}
          {/* Routes dành cho Admin, Trưởng Khoa, Giáo Vụ */}
          {user && canViewAdminRoutes && (
            <>
              <Route path="admin/users" element={<UserManagementPage />} />
              <Route path="admin/groups" element={<GroupAdminPage />} />

              {/* Routes dành cho Admin Quản lý Tin tức */}
              <Route path="admin/news" element={<NewsManagementPage />} />

              {/* Routes Quản lý Kế hoạch Khóa luận */}
              <Route path="admin/thesis-plans" element={<ThesisPlanManagementPage />} />
              <Route path="admin/thesis-plans/create" element={<PlanFormPage />} />
              <Route path="admin/thesis-plans/:planId/edit" element={<PlanFormPage />} />
              <Route
                path="admin/thesis-plans/:planId/participants"
                element={<PlanParticipantPage />}
              />

              {/* Routes Quản lý Kế hoạch Mẫu */}
              <Route path="admin/templates" element={<TemplateManagementPage />} />
              <Route path="admin/templates/create" element={<TemplateFormPage />} />
              <Route path="admin/templates/:templateId/edit" element={<TemplateFormPage />} />
            </>
          )}
          {/* ----- KẾT THÚC SỬA ĐỔI ----- */}
        </Route>

        {/* Route dự phòng (chuyển hướng về trang chủ) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
