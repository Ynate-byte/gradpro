import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProfilePage from './features/profile';

// --- Import các components Layout và Auth ---
const AuthenticatedLayout = lazy(() => import('./layout/AuthenticatedLayout'));
const Login = lazy(() => import('./features/auth/Login'));

// --- Import các components chung ---
const HomePage = lazy(() => import('./features/home/HomePage'));
const NewsManagementPage = lazy(() => import('./features/news-management/index.jsx'));
const NewsDetail = lazy(() => import('./features/news-management/NewsDetail'));
const PersonalHistoryPage = lazy(() => import('./features/history/PersonalHistoryPage'));
const AppearancePage = lazy(() => import('./features/admin/settings/AppearancePage.jsx'));

// --- Import components Giảng viên (bao gồm Dashboard) ---
const LecturerDashboard = lazy(() => import('./features/lecturer/dashboard/LecturerDashboard.jsx'));
const LecturerThesisTopicsPage = lazy(() => import('./features/lecturer/thesis-topics/index.jsx'));
const LecturerGroupsManagementPage = lazy(() => import('./features/lecturer/groups-management/index.jsx'));
const GiangVienHoiDong = lazy(() => import('./features/lecturer/council/index.jsx'));
const LecturerGradingPage = lazy(() => import('./features/lecturer/grading/index.jsx'));
const LecturerGroupDetailPage = lazy(() => import('./features/lecturer/groups-management/pages/LecturerGroupDetailPage.jsx'));
const LecturerQuotaManagementPage = lazy(() => import('./features/lecturer/quota-management/index.jsx'));
const LecturerCalendarPage = lazy(() => import('./features/lecturer/calendar/LecturerCalendarPage.jsx'));

// --- Import các components Sinh viên ---
const MyGroupPage = lazy(() => import('./features/student/my-group/index.jsx'));
const FindGroupPage = lazy(() => import('./features/student/find-group/index.jsx'));
const MyPlansPage = lazy(() => import('./features/student/my-plans/index.jsx'));
const StudentThesisTopicsPage = lazy(() => import('./features/student/thesis-topics/index.jsx'));
const MeetingCalendarPage = lazy(() => import('./features/student/my-group/pages/MeetingCalendarPage.jsx'));
const KanbanPage = lazy(() => import('./features/student/my-group/pages/KanbanPage.jsx'));
const StudentOverviewDashboard = lazy(() => import('./features/student/dashboard/OverviewDashboard'));
const StudentDetailDashboard = lazy(() => import('./features/student/dashboard/DetailDashboard'));

// --- Import component Trưởng bộ môn ---
const TopicReviewerAssignmentPage = lazy(() => import('./features/department-head/topic-reviewer-assignment/index.jsx'));

// --- Import các components Quản trị ---
const AdminDashboard = lazy(() => import('./features/admin/dashboard/AdminDashboard.jsx'));
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
const AdminQuotaManager = lazy(() => import('./features/admin/thesis-topic-management/components/QuotaManager.jsx'));
const ListNhomChamDiem = lazy(() => import('./features/admin/chamdiem/ListNhomChamDiem.jsx'));
const ChamDiemChiTiet = lazy(() => import('./features/admin/chamdiem/ChamDiemChiTiet.jsx'));
const GeneralSettingsPage = lazy(() => import('./features/admin/settings/GeneralSettingsPage.jsx'));
const AdminActivityLog = lazy(() => import('./features/admin/activity-log/index.jsx'));
const NotificationPage = lazy(() => import('./features/notifications/index.jsx'));
const FileManagerPage = lazy(() => import('./features/admin/file-manager/FileManager.jsx'));

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

  const role = user?.vaitro?.TEN_VAITRO;
  
  // Lấy danh sách mã chức vụ
  const positionCodes = user?.giangvien?.chucvus?.map(cv => cv.MA_CHUCVU) || [];

  const isAdmin = role === 'Admin';
  
  // Phân quyền chi tiết
  const isTruongKhoa = isAdmin || role === 'Trưởng khoa' || positionCodes.includes('TRUONG_KHOA');
  const isGiaoVu = isAdmin || role === 'Giáo vụ' || positionCodes.includes('GIAO_VU');
  const isTruongBoMon = isAdmin || positionCodes.includes('TRUONG_BOMON');
  
  const isGiangVien = ['Giảng viên', 'Giảng Viên'].includes(role);
  const isSinhVien = role === 'Sinh viên';

  const canViewAdminRoutes = isAdmin || isTruongKhoa || isGiaoVu;
  const canViewGiangVienRoutes = isGiangVien || isTruongKhoa || isGiaoVu || isAdmin;
  const canChamDiem = isGiangVien || isTruongKhoa || isGiaoVu || isAdmin;

  // [UPDATED] Component điều hướng trang chủ
  const HomeRedirect = () => {
    if (isSinhVien) {
      return <Navigate to="/student/dashboard" replace />;
    }
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // Nếu là Giảng viên / Giáo vụ / Trưởng khoa (không phải Admin thuần) -> Vào Dashboard GV
    if (canViewGiangVienRoutes) {
      return <LecturerDashboard />;
    }
    // Mặc định
    return <HomePage />;
  };

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
          {/* [UPDATED] Route trang chủ động theo vai trò */}
          <Route index element={<HomeRedirect />} />

          {/* Các Routes chung */}
          <Route path="notifications" element={<NotificationPage />} />
          <Route path="starred" element={<PlaceholderPage title="Đã lưu" />} />
          <Route path="students" element={<PlaceholderPage title="Sinh viên" />} />
          <Route path="/profile" element={<ProfilePage />} />
          
          <Route path="history" element={<PersonalHistoryPage />} />

          <Route path="settings/account" element={<PlaceholderPage title="Tài khoản" />} />
          <Route path="settings/appearance" element={<AppearancePage />} />

          {/* Các Routes chung tin tức */}
          <Route path="news" element={<NewsManagementPage />} />
          <Route path="news/:id" element={<NewsDetail />} />

          {/* Routes dành cho Sinh viên */}
          {isSinhVien && (
            <>
              <Route path="student/dashboard" element={<StudentOverviewDashboard />} />
              <Route path="student/dashboard/:planId" element={<StudentDetailDashboard />} />
              
              <Route path="projects/topics" element={<StudentThesisTopicsPage />} />
              <Route path="projects/my-plans" element={<MyPlansPage />} />
              <Route path="projects/my-group" element={<MyGroupPage />} />
              <Route path="projects/my-group/schedule/:nhomId" element={<MeetingCalendarPage />} />
              <Route path="projects/my-group/kanban/:nhomId" element={<KanbanPage />} />
              <Route path="projects/find-group" element={<FindGroupPage />} />
            </>
          )}

          {/* Routes dành cho Giảng viên (Bao gồm GV, TK, GVụ, Admin) */}
          {canViewGiangVienRoutes && (
            <>
              {!isSinhVien && <Route path="lecturer/thesis-topics" element={<LecturerThesisTopicsPage />} />}
              <Route path="lecturer/groups-management" element={<LecturerGroupsManagementPage />} />
              <Route path="lecturer/groups-management/:nhomId/details" element={<LecturerGroupDetailPage />} />
              <Route path="lecturer/groups-management/:nhomId/kanban" element={<KanbanPage />} />
              <Route path="lecturer/groups-management/:nhomId/schedule" element={<MeetingCalendarPage />} />
              <Route path="lecturer/quota-management" element={<LecturerQuotaManagementPage />} />
              <Route path="lecturer/council" element={<GiangVienHoiDong />} />
              <Route path="lecturer/grading" element={<LecturerGradingPage />} />
              <Route path="lecturer/calendar" element={<LecturerCalendarPage />} />
              <Route path="lecturer/submissions" element={<SubmissionManagementPage />} />
            </>
          )}

          {/* Routes dành cho Trưởng bộ môn */}
          {isTruongBoMon && (
            <>
              <Route path="department-head/topic-reviewer-assignment" element={<TopicReviewerAssignmentPage />} />
            </>
          )}

          {/* Routes dành cho Admin/Giáo vụ/Trưởng khoa */}
          {canChamDiem && (
            <>
              {/* Route cho Admin nhập điểm hộ */}
              <Route path="admin/cham-diem" element={<ListNhomChamDiem />} />
              <Route path="admin/cham-diem/:idNhom" element={<ChamDiemChiTiet />} />
            </>
          )}

          {/* Routes dành cho Admin, Trưởng Khoa, Giáo Vụ */}
          {canViewAdminRoutes && (
            <>
              {/* [MỚI] Route Dashboard Admin */}
              <Route path="admin/dashboard" element={<AdminDashboard />} />

              <Route path="admin/users" element={<UserManagementPage />} />
              <Route path="admin/groups" element={<GroupAdminPage />} />
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

              {/* Routes Quản lý Đề tài Khóa luận */}
              <Route path="admin/thesis-topics" element={<AdminThesisTopicsPage />} />
              <Route path="admin/submissions" element={<SubmissionManagementPage />} />

              {/* Routes Quản lý Hội đồng */}
              <Route path="admin/hoidong/*" element={<HoidongPage />} />

              {/* Routes Cài đặt & Quota */}
              <Route path="admin/settings/general" element={<GeneralSettingsPage />} />
              <Route path="admin/quota-management" element={<AdminQuotaManager />} />
              
              {/*Route Nhật ký hệ thống */}
              <Route path="admin/system-logs" element={<AdminActivityLog />} />
              <Route path="admin/files" element={<FileManagerPage />} />
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