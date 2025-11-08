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
const StudentThesisTopicsPage = lazy(() => import('./features/student/thesis-topics/index.jsx'));

// --- Import các components Giảng viên ---
const LecturerThesisTopicsPage = lazy(() => import('./features/lecturer/thesis-topics/index.jsx'));
const LecturerGroupsManagementPage = lazy(() => import('./features/lecturer/groups-management/index.jsx'));
const GiangVienHoiDong = lazy(() => import('./features/lecturer/council/index.jsx'));
const GiangVienChinhSua = lazy(() => import('./features/lecturer/council/EditCouncilPage.jsx'));
const LecturerGradingPage = lazy(() => import('./features/lecturer/grading/index.jsx'));

// --- Import các components Quản trị ---
const UserManagementPage = lazy(() => import('./features/admin/user-management/index.jsx'));
const GroupAdminPage = lazy(() => import('./features/admin/group-management/index.jsx'));
const ThesisPlanManagementPage = lazy(() => import('./features/admin/thesis-plan-management/index.jsx'));
const PlanFormPage = lazy(() => import('./features/admin/thesis-plan-management/PlanFormPage.jsx'));
const PlanParticipantPage = lazy(() => import('./features/admin/thesis-plan-management/PlanParticipantPage.jsx'));
const TemplateManagementPage = lazy(() => import('./features/admin/thesis-plan-template-management/index.jsx'));
const TemplateFormPage = lazy(() => import('./features/admin/thesis-plan-template-management/TemplateFormPage.jsx'));
const AdminThesisTopicsPage = lazy(() => import('./features/admin/thesis-topic-management/index.jsx'));
const SubmissionManagementPage = lazy(() => import('./features/admin/submission-management/index.jsx'));
const HoidongPage = lazy(() => import('./features/admin/hoidong/index.jsx'));
const LecturerQuotaManagementPage = lazy(() => import('./features/lecturer/quota-management/index.jsx'));

const AdminQuotaManager = lazy(() => import('./features/admin/thesis-topic-management/components/QuotaManager.jsx'));
const ListNhomChamDiem = lazy(() => import('./features/admin/chamdiem/ListNhomChamDiem.jsx'));
const ChamDiemChiTiet = lazy(() => import('./features/admin/chamdiem/ChamDiemChiTiet.jsx'));

// [QUAN TRỌNG] Thêm dòng import còn thiếu này
const GeneralSettingsPage = lazy(() => import('./features/admin/settings/GeneralSettingsPage.jsx'));


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

  // ----- Logic kiểm tra quyền -----
  const role = user?.vaitro?.TEN_VAITRO;
  const position = user?.giangvien?.CHUCVU;

  const isAdmin = role === 'Admin';
  const isTruongKhoa = role === 'Trưởng khoa' || position === 'Trưởng khoa';
  const isGiaoVu = role === 'Giáo vụ' || position === 'Giáo vụ';
  const isGiangVien = ['Giảng viên', 'Giảng Viên'].includes(role); // Giảng viên thường
  const isSinhVien = role === 'Sinh viên';

  // Quyền xem menu Admin (Admin, Trưởng khoa, Giáo vụ)
  const canViewAdminRoutes = isAdmin || isTruongKhoa || isGiaoVu;
  // Quyền xem các mục của Giảng viên (GV, TK, GVụ, Admin)
  const canViewGiangVienRoutes = isGiangVien || isTruongKhoa || isGiaoVu || isAdmin;
  // Quyền chấm điểm (GV, TK, GVụ, Admin)
  const canChamDiem = isGiangVien || isTruongKhoa || isGiaoVu || isAdmin;


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

          <Route path="settings/account" element={<PlaceholderPage title="Tài khoản" />} />
          <Route path="settings/appearance" element={<PlaceholderPage title="Giao diện" />} />

          {/* Các Routes chung tin tức */}
          <Route path="news" element={<NewsManagementPage />} />
          <Route path="news/:id" element={<NewsDetail />} />

          {/* Routes dành cho Sinh viên */}
          {isSinhVien && (
            <>
              <Route path="projects/topics" element={<StudentThesisTopicsPage />} />
              <Route path="projects/my-plans" element={<MyPlansPage />} />
              <Route path="projects/my-group" element={<MyGroupPage />} />
              <Route path="projects/find-group" element={<FindGroupPage />} />
            </>
          )}

          {/* Routes dành cho Giảng viên (Bao gồm GV, TK, GVụ, Admin) */}
          {canViewGiangVienRoutes && (
            <>
              {!isSinhVien && <Route path="projects/topics" element={<LecturerThesisTopicsPage />} />}
              <Route path="lecturer/groups-management" element={<LecturerGroupsManagementPage />} />
              <Route path="lecturer/quota-management" element={<LecturerQuotaManagementPage />} />
              <Route path="lecturer/council" element={<GiangVienHoiDong />} />
              <Route path="lecturer/council/:id" element={<GiangVienChinhSua />} />
              <Route path="lecturer/grading" element={<LecturerGradingPage />} />
            </>
          )}

          {/* Routes dành cho Admin/Giáo vụ/Trưởng khoa */}
          {canChamDiem && (
            <>
              <Route path="admin/cham-diem" element={<ListNhomChamDiem />} />
              <Route path="admin/cham-diem/:idNhom" element={<ChamDiemChiTiet />} />  
            </>
          )}

          {/* Routes dành cho Admin, Trưởng Khoa, Giáo Vụ */}
          {canViewAdminRoutes && (
            <>
              <Route path="admin/users" element={<UserManagementPage />} />
              <Route path="admin/groups" element={<GroupAdminPage />} />
              <Route path="admin/news" element={<NewsManagementPage />} />
              
              <Route path="admin/thesis-plans" element={<ThesisPlanManagementPage />} />
              <Route path="admin/thesis-plans/create" element={<PlanFormPage />} />
              <Route path="admin/thesis-plans/:planId/edit" element={<PlanFormPage />} />
              <Route
                path="admin/thesis-plans/:planId/participants"
                element={<PlanParticipantPage />}
              />

              <Route path="admin/templates" element={<TemplateManagementPage />} />
              <Route path="admin/templates/create" element={<TemplateFormPage />} />
              <Route path="admin/templates/:templateId/edit" element={<TemplateFormPage />} />
              
              <Route path="admin/thesis-topics" element={<AdminThesisTopicsPage />} />
              <Route path="admin/submissions" element={<SubmissionManagementPage />} />

              <Route path="admin/hoidong/*" element={<HoidongPage />} />

              {/* Route này giờ đã có component để render */}
              <Route path="admin/settings/general" element={<GeneralSettingsPage />} />

              <Route path="admin/quota-management" element={<AdminQuotaManager />} />
            </>
          )}
        </Route>

        {/* Route dự phòng (chuyển hướng về trang chủ) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;