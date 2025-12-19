<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SecureFileController;
use App\Http\Controllers\Api\NhomController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Admin\GroupAdminController;
use App\Http\Controllers\Api\Admin\ThesisPlanController;
use App\Http\Controllers\Api\Admin\ThesisPlanTemplateController as AdminTemplateController;
use App\Http\Controllers\Api\Admin\DetaiAdminController;
use App\Http\Controllers\Api\DepartmentHead\DetaiController as DepartmentHeadDetaiController;
use App\Http\Controllers\Api\ThesisPlanTemplateController as UserTemplateController;
use App\Http\Controllers\Api\DetaiController;
use App\Http\Controllers\Api\Admin\SubmissionController as AdminSubmissionController;
use App\Http\Controllers\Api\Admin\GiangVienController;
use App\Http\Controllers\Api\Admin\HoiDongController;
use App\Http\Controllers\Api\ChamDiemController;
use App\Http\Controllers\Api\Admin\TopicAssignmentController;
use App\Http\Controllers\Api\DepartmentHead\TopicAssignmentController as DepartmentHeadTopicController;
use App\Http\Controllers\Api\Lecturer\TopicAssignmentController as LecturerTopicController;
use App\Http\Controllers\Api\Lecturer\QuotaController as LecturerQuotaController;
use App\Http\Controllers\Api\Admin\QuotaController;
use App\Http\Controllers\Api\DepartmentHead\QuotaController as DepartmentHeadQuotaController;
use App\Http\Controllers\Api\PhanhoiGoiyController;
use App\Http\Controllers\Api\LichHopController;
use App\Http\Controllers\Api\CongViecController;
use App\Http\Controllers\Api\LecturerDashboardController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\Student\StudentDashboardController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\FileManagerController;
use App\Http\Controllers\Api\Admin\NotificationController as AdminNotificationController;
use App\Http\Controllers\Api\Admin\BackupController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'throttle:100,1', 'force.change.password'])->group(function () {
    
    Route::get('/secure-download/{fileId}', [SecureFileController::class, 'download']);
    
    // =================================================================================
    // A. XÁC THỰC & PROFILE
    // =================================================================================
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']); // Thêm route lấy thông tin user hiện tại
    Route::put('/user/profile', [ProfileController::class, 'updateProfile']);
    Route::put('/user/change-password', [ProfileController::class, 'changePassword']);
    
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/mark-as-read', [NotificationController::class, 'markAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // =================================================================================
    // B. LỊCH SỬ HOẠT ĐỘNG
    // =================================================================================
    Route::get('/history/personal/stats', [HistoryController::class, 'getPersonalStats']);
    Route::get('/history/personal', [HistoryController::class, 'getPersonalHistory']);
    // Đặt route này ở đây để đảm bảo nó được load
    Route::get('/history/group/{groupId}', [HistoryController::class, 'getGroupHistory']);
    Route::get('/history/topic/{topicId}', [HistoryController::class, 'getTopicHistory']);
    Route::get('/history/topic/{topicId}/comparison', [HistoryController::class, 'getComparisonData']);

    // =================================================================================
    // C. QUẢN LÝ NGƯỜI DÙNG (CRUD Chung)
    // =================================================================================
    Route::apiResource('users', UserController::class);
    Route::post('users/bulk-action', [UserController::class, 'bulkAction']);
    Route::post('users/bulk-delete', [UserController::class, 'bulkDelete']);
    Route::post('users/bulk-reset-password', [UserController::class, 'bulkResetPassword']);
    Route::post('users/{id}/reset-password', [UserController::class, 'resetPassword']);
    
    // Helper routes
    Route::get('roles', [UserController::class, 'getRoles']);
    Route::get('chuyen-nganhs', [UserController::class, 'getChuyenNganhs']);
    Route::get('khoa-bo-mons', [UserController::class, 'getKhoaBomons']);
    Route::get('positions', [UserController::class, 'getPositions']); 
    
    // Import Users
    Route::get('/users/import/template', [UserController::class, 'downloadImportTemplate']);
    Route::post('/users/import/preview', [UserController::class, 'previewImport']);
    Route::post('/users/import/process', [UserController::class, 'processImport']);

    // =================================================================================
    // D. CHỨC NĂNG SINH VIÊN & NHÓM
    // =================================================================================
    Route::prefix('nhom')->group(function () {
        Route::get('/my-group', [NhomController::class, 'getMyGroup']);
        Route::get('/find', [NhomController::class, 'findGroups']);
        Route::get('/plan/{planId}/available-students', [NhomController::class, 'searchAvailableStudents']);
        
        Route::post('/', [NhomController::class, 'createGroup']);
        Route::post('/{nhom}/invite', [NhomController::class, 'inviteMember']);
        Route::post('/{nhom}/invite-multiple', [NhomController::class, 'inviteMultipleMembers']);
        Route::post('/{nhom}/request-join', [NhomController::class, 'requestToJoin']);
        Route::post('/{nhom}/requests/{yeucau}/handle', [NhomController::class, 'handleJoinRequest']);
        Route::post('/leave', [NhomController::class, 'leaveGroup']);
        Route::post('/{nhom}/transfer-leadership/{newLeaderId}', [NhomController::class, 'transferLeadership']);
        Route::post('/{nhom}/invitations/{loimoi}/cancel', [NhomController::class, 'cancelInvitation']);
        
        // Nộp bài trong nhóm
        Route::prefix('submissions')->group(function () {
            Route::get('/{phancong}', [NhomController::class, 'getSubmissions']); 
            Route::post('/{phancong}', [NhomController::class, 'submitProduct']); 
        });
    });
    
    Route::post('/requests/{yeucau}/cancel', [NhomController::class, 'cancelJoinRequest']);
    Route::get('/invitations', [InvitationController::class, 'getPendingInvitations']);
    Route::post('/invitations/{loimoi}/handle', [InvitationController::class, 'handleInvitation']);
    
    // Student Utils
    Route::get('/student/my-active-plans', [NhomController::class, 'getActivePlansForStudent']);
    Route::get('/check-group-leader', [DetaiController::class, 'isGroupLeader']);
    Route::get('/group-status', [DetaiController::class, 'groupStatus']);
    Route::get('/groups/{nhom}/details', [NhomController::class, 'getGroupDetailsById']); 
    Route::get('/groups/{id}', [NhomController::class, 'getGroupById']); // Fallback

    // Student Dashboard
    Route::prefix('student/dashboard')->group(function () {
        Route::get('/overview', [StudentDashboardController::class, 'getOverview']);
        Route::get('/detail/{planId}', [StudentDashboardController::class, 'getDetail']);
    });

    // =================================================================================
    // E. QUẢN LÝ CÔNG VIỆC (KANBAN) & LỊCH HỌP
    // =================================================================================
    Route::prefix('kanban')->group(function () {
        Route::get('/board/{nhom}', [CongViecController::class, 'getBoardData']);
        Route::get('/stats/{nhom}', [CongViecController::class, 'getTaskStats']);
        
        // Task CRUD
        Route::post('/task/nhom/{nhom}', [CongViecController::class, 'createTask']);
        Route::get('/task/{congviec}/details', [CongViecController::class, 'getTaskDetails']); 
        Route::put('/task/{congviec}', [CongViecController::class, 'updateTask']);
        Route::put('/task/{congviec}/move', [CongViecController::class, 'moveTask']);
        Route::delete('/task/{congviec}', [CongViecController::class, 'deleteTask']);
        Route::post('/task/{congviec}/assign', [CongViecController::class, 'assignTask']);
        
        // Checklist & Comment
        Route::post('/task/{congviec}/checklist', [CongViecController::class, 'addChecklistItem']); 
        Route::put('/checklist/{item}', [CongViecController::class, 'updateChecklistItem']);
        Route::delete('/checklist/{item}', [CongViecController::class, 'deleteChecklistItem']); 
        Route::post('/task/{congviec}/comment', [CongViecController::class, 'addComment']);
    });

    Route::prefix('lichhop')->group(function () {
        Route::get('/nhom/{nhom}', [LichHopController::class, 'getMeetingsForGroup']);
        Route::post('/nhom/{nhom}', [LichHopController::class, 'storeMeetingForGroup']);
        Route::put('/{lichhop}', [LichHopController::class, 'updateMeeting']);
        Route::delete('/{lichhop}', [LichHopController::class, 'cancelMeeting']);
    });

    // =================================================================================
    // F. TIN TỨC & KẾ HOẠCH MẪU (CHUNG)
    // =================================================================================
    Route::get('/news', [NewsController::class, 'index']); 
    Route::post('/news', [NewsController::class, 'store']);
    Route::get('/news/{id}', [NewsController::class, 'show']);
    Route::post('/news/{id}', [NewsController::class, 'update']);
    Route::delete('/news/{id}', [NewsController::class, 'destroy']);
    Route::get('/news/{id}/pdf', [NewsController::class, 'downloadPdf']); 
    
    Route::get('thesis-plan-templates', [UserTemplateController::class, 'index']);
    Route::get('thesis-plan-templates/{id}', [UserTemplateController::class, 'show']);

    // =================================================================================
    // G. ĐỀ TÀI KHÓA LUẬN (USER - Sinh viên/Giảng viên)
    // =================================================================================
    Route::prefix('detai')->group(function () {
        Route::get('/', [DetaiController::class, 'index']);
        Route::post('/', [DetaiController::class, 'store']);
        Route::get('/available/supervisors', [DetaiController::class, 'getSupervisorsByPlan']); 
        Route::get('/available/for-registration', [DetaiController::class, 'getAvailableTopics']);
        Route::get('/approved/topics', [DetaiController::class, 'getApprovedTopicsOfLecturer']);
        Route::get('/registered-groups', [DetaiController::class, 'getRegisteredGroups']); 
        Route::get('/supervised', [DetaiController::class, 'getSupervisedTopics']);
        Route::get('/my-registered-topic', [DetaiController::class, 'getMyRegisteredTopic']);
        Route::get('/giangvien/groups', [DetaiController::class, 'getGroupsForLecturer']); 
        
        Route::get('/import/template', [DetaiController::class, 'downloadImportTemplate']);
        Route::post('/import/preview', [DetaiController::class, 'previewImport']);
        Route::post('/import/process', [DetaiController::class, 'processImport']);
        
        Route::post('/reuse', [DetaiController::class, 'reuseApprovedTopic']);

        Route::get('/{id}', [DetaiController::class, 'show']); 
        Route::put('/{id}', [DetaiController::class, 'update']);
        Route::delete('/{id}', [DetaiController::class, 'destroy']);
        Route::post('/{id}/submit-approval', [DetaiController::class, 'submitForApproval']);
        Route::post('/{id}/approve-reject', [DetaiController::class, 'approveOrReject']); 
        Route::post('/{id}/suggestions', [DetaiController::class, 'addSuggestion']);
        Route::post('/goiy/{goiy}/reply', [PhanhoiGoiyController::class, 'store']);
        Route::post('/{topicId}/register-group', [DetaiController::class, 'registerGroup']);
    });

    // =================================================================================
    // H. KHU VỰC QUẢN TRỊ (ADMIN / GIÁO VỤ / TRƯỞNG KHOA)
    // =================================================================================
    Route::prefix('admin')->group(function () {
        
        // Dashboard
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'getStats']);
        Route::get('/dashboard/reminders', [AdminDashboardController::class, 'getReminders']);
        Route::get('/dashboard/incomplete-quotas', [AdminDashboardController::class, 'getIncompleteQuotaDetails']);
        
        // QUẢN LÝ FILE
        Route::get('/file-manager', [FileManagerController::class, 'index']);
        Route::post('/file-manager/upload', [FileManagerController::class, 'upload']);
        Route::post('/file-manager/create-folder', [FileManagerController::class, 'createFolder']);
        Route::post('/file-manager/delete', [FileManagerController::class, 'delete']); // Single delete
        Route::post('/file-manager/bulk-delete', [FileManagerController::class, 'bulkDelete']); // Bulk delete
        Route::get('/file-manager/download', [FileManagerController::class, 'download']); // Download single
        Route::post('/file-manager/bulk-download', [FileManagerController::class, 'bulkDownload']); // Download multiple

        // Kế hoạch Khóa luận
        Route::get('thesis-plans/list-all', [ThesisPlanController::class, 'getAllPlans']);
        Route::post('thesis-plans/preview-new', [ThesisPlanController::class, 'previewNewPlan']);
        Route::get('thesis-plans/filter-options', [ThesisPlanController::class, 'getFilterOptions']);
        Route::apiResource('thesis-plans', ThesisPlanController::class)->parameters(['thesis-plans' => 'plan']);
        Route::get('thesis-plans/{plan}/settings', [ThesisPlanController::class, 'getPlanSettings']);
        Route::put('thesis-plans/{plan}/settings', [ThesisPlanController::class, 'updatePlanSettings']);
        Route::post('thesis-plans/{plan}/submit-approval', [ThesisPlanController::class, 'submitForApproval']);
        Route::post('thesis-plans/{plan}/approve', [ThesisPlanController::class, 'approve']);
        Route::post('thesis-plans/{plan}/request-changes', [ThesisPlanController::class, 'requestChanges']);
        Route::get('thesis-plans/{plan}/export-document', [ThesisPlanController::class, 'exportDocument']);
        Route::get('thesis-plans/{plan}/preview-document', [ThesisPlanController::class, 'previewDocument']);
        Route::post('thesis-plans/{plan}/activate', [ThesisPlanController::class, 'activatePlan']);

        // Sinh viên tham gia kế hoạch
        Route::prefix('thesis-plans/{plan}/participants')->group(function () {
            Route::get('/', [ThesisPlanController::class, 'getParticipants']);
            Route::post('/', [ThesisPlanController::class, 'addParticipants']);
            Route::put('/{sinhvienThamgia}', [ThesisPlanController::class, 'updateParticipant']);
            Route::delete('/{sinhvienThamgia}', [ThesisPlanController::class, 'removeParticipant']);
            Route::post('/bulk-remove', [ThesisPlanController::class, 'bulkRemoveParticipants']);
        });
        Route::get('thesis-plans/{plan}/search-students', [ThesisPlanController::class, 'searchStudentsForPlan']);
        
        // Import Wizard Sinh viên
        Route::post('thesis-plans/{plan}/import-analyze', [ThesisPlanController::class, 'importAnalyze']);
        Route::post('thesis-plans/{plan}/import-preview', [ThesisPlanController::class, 'importPreview']); 
        Route::post('thesis-plans/{plan}/import-process', [ThesisPlanController::class, 'importProcess']); 

        // Quản lý Nhóm (Admin)
        Route::prefix('groups')->group(function () {
            Route::get('/', [GroupAdminController::class, 'getGroups']);
            Route::get('/statistics', [GroupAdminController::class, 'getStatistics']);
            Route::get('/inactive-students', [GroupAdminController::class, 'getInactiveStudents']);
            Route::get('/search-ungrouped-students', [GroupAdminController::class, 'searchUngroupedStudents']);
            Route::post('/create-with-members', [GroupAdminController::class, 'createWithMembers']);
            Route::post('/remove-inactive-students', [GroupAdminController::class, 'removeInactiveStudentsFromPlan']);
            Route::post('/auto-group', [GroupAdminController::class, 'autoGroupStudents']);
            Route::get('/export', [GroupAdminController::class, 'exportGroups']);
            Route::get('/ungrouped-students', [GroupAdminController::class, 'getUngroupedStudents']);
            Route::post('/add-members', [GroupAdminController::class, 'addMembersToGroup']);
            Route::put('/{nhom}', [GroupAdminController::class, 'update']);
            Route::delete('/{nhom}', [GroupAdminController::class, 'destroy']);
            Route::post('/{nhom}/mark-special', [GroupAdminController::class, 'markAsSpecial']);
            Route::post('/{nhom}/remove-member/{userId}', [GroupAdminController::class, 'removeMember']);
            Route::post('/{nhom}/assign-topic', [GroupAdminController::class, 'assignTopic']);
        });

        // Quản lý Mẫu Kế hoạch
        Route::apiResource('thesis-plan-templates', AdminTemplateController::class)
            ->parameters(['thesis-plan-templates' => 'template']);

        // Quản lý Đề tài (Admin)
        Route::prefix('detai')->group(function () {
            Route::get('/', [DetaiAdminController::class, 'index']);
            Route::get('/pending', [DetaiAdminController::class, 'getPendingTopics']);
            Route::get('/statistics', [DetaiAdminController::class, 'getStatistics']);
            Route::get('/{id}', [DetaiAdminController::class, 'show']);
            Route::post('/{id}/approve-reject', [DetaiAdminController::class, 'approveOrReject']);
            Route::post('/bulk-approve', [DetaiAdminController::class, 'bulkApprove']); // <--- Thêm dòng này
        });
        
        // Quản lý Quota
        Route::prefix('quotas')->group(function () {
            Route::get('/departments', [QuotaController::class, 'getDepartments']);
            Route::get('/assignments', [QuotaController::class, 'getAssignments']);
            Route::get('/statistics', [QuotaController::class, 'getStatistics']);
            Route::post('/assign-department-quota', [QuotaController::class, 'assignDepartmentQuota']);
            Route::post('/auto-assign-quotas', [QuotaController::class, 'autoAssignQuotas']);
            Route::put('/{assignment}/status', [QuotaController::class, 'updateAssignmentStatus']);
            Route::delete('/{assignment}', [QuotaController::class, 'removeAssignment']);
            Route::post('/update-reuse-percentage', [QuotaController::class, 'updateReusePercentage']);
            Route::post('/nudge-department', [QuotaController::class, 'nudgeDepartment']);
            Route::post('/nudge-all', [QuotaController::class, 'nudgeAllDepartments']);
            Route::post('/nudge-lecturer', [QuotaController::class, 'nudgeLecturer']);
        });
        
        // Quản lý Nộp bài
        Route::prefix('submissions')->group(function () {
            Route::get('/statistics', [AdminSubmissionController::class, 'getStatistics']);
            Route::get('/', [AdminSubmissionController::class, 'index']); 
            Route::get('/{submission}', [AdminSubmissionController::class, 'show']); 
            Route::post('/{submission}/confirm', [AdminSubmissionController::class, 'confirmSubmission']); 
            Route::post('/{submission}/reject', [AdminSubmissionController::class, 'rejectSubmission']); 
            Route::get('/phancong/{phancong}', [AdminSubmissionController::class, 'getSubmissionsForPhancong']);
        });

        // Quản lý Hội đồng
        Route::prefix('hoidong')->group(function () {
            Route::get('/auto-create-stats', [HoiDongController::class, 'getAutoCreateStats']);
            Route::post('/create-bulk-department', [HoiDongController::class, 'createBulkByDepartment']);
            Route::get('/statistics', [HoiDongController::class, 'getStatistics']);
            Route::get('/workload-stats', [HoiDongController::class, 'getLecturerWorkload']); 
            Route::get('/kehoach-options', [HoiDongController::class, 'getKeHoachOptions']);
            Route::get('/chuyennganh-options', [HoiDongController::class, 'getChuyenNganhOptions']);
            Route::get('/{idKeHoach}/nhoms', [HoiDongController::class, 'getNhomTheoKeHoach']);
            Route::post('/phanbo-nhom', [HoiDongController::class, 'phanBoNhom']);
            Route::get('/', [HoiDongController::class, 'index']);
            Route::post('/', [HoiDongController::class, 'create']);
            Route::get('/{id}', [HoiDongController::class, 'show']); 
            Route::put('/{id}', [HoiDongController::class, 'update']);
            Route::delete('/{id}', [HoiDongController::class, 'destroy']);
            Route::patch('/{id}/update-phong', [HoiDongController::class, 'updatePhong']);
            Route::patch('/{id}/update-name', [HoiDongController::class, 'updateTenHoiDong']);
            Route::patch('/{id}/update-gio', [HoiDongController::class, 'updateGio']);
            Route::post('/auto-assign-members', [HoiDongController::class, 'autoAssignMembers']);
            Route::post('/bulk-upgrade', [HoiDongController::class, 'bulkUpgrade']);
            Route::post('/{id}/upgrade-to-hoidong', [HoiDongController::class, 'upgradePhanBienToHoiDong']);
            Route::delete('/{idHoiDong}/nhom/{idNhom}', [HoiDongController::class, 'xoaPhanBoNhom']);
            Route::post('/auto-assign-groups', [HoiDongController::class, 'autoAssignGroups']);
        });
        
        // Phân công Đề tài (Giám sát)
        Route::prefix('topic-assignments')->group(function () {
            Route::get('/lecturers', [TopicAssignmentController::class, 'getLecturers']);
            Route::post('/assign-topic-quota', [TopicAssignmentController::class, 'assignTopicQuota']);
            Route::post('/auto-assign-quotas', [TopicAssignmentController::class, 'autoAssignQuotas']);
            Route::post('/assign-topic-supervisor', [TopicAssignmentController::class, 'assignTopicToLecturer']);
            Route::get('/assignments', [TopicAssignmentController::class, 'getAssignments']);
            Route::put('/{assignmentId}/status', [TopicAssignmentController::class, 'updateAssignmentStatus']);
            Route::delete('/{assignmentId}', [TopicAssignmentController::class, 'removeAssignment']);
        });

        // Hệ thống & Log
        Route::get('/history', [HistoryController::class, 'getSystemHistory']);
        Route::post('/history/cleanup', [HistoryController::class, 'cleanup']);
        Route::get('/giangvien', [GiangVienController::class, 'index']);
        Route::post('/notifications/broadcast', [AdminNotificationController::class, 'broadcast']);

        //Backup & restore
        Route::get('/backups', [BackupController::class, 'index']);
        Route::post('/backups', [BackupController::class, 'create']);
        Route::get('/backups/download', [BackupController::class, 'download']);
        Route::post('/backups/delete', [BackupController::class, 'destroy']);
        Route::post('/backups/restore', [BackupController::class, 'restore']);
    });

    // =================================================================================
    // I. KHU VỰC TRƯỞNG BỘ MÔN
    // =================================================================================
    Route::prefix('department-head')->group(function () {
        Route::prefix('quotas')->group(function () {
            Route::get('/lecturers', [DepartmentHeadQuotaController::class, 'getLecturers']);
            Route::post('/assign-lecturer-quota', [DepartmentHeadQuotaController::class, 'assignLecturerQuota']);
            Route::post('/auto-assign-lecturer-quotas', [DepartmentHeadQuotaController::class, 'autoAssignLecturerQuotas']);
        });

        Route::prefix('topic-assignments')->group(function () {
            Route::get('/lecturers', [DepartmentHeadTopicController::class, 'getLecturers']);
            Route::post('/assign-topic-quota', [DepartmentHeadTopicController::class, 'assignTopicQuota']);
            Route::post('/auto-assign-topic-quotas', [DepartmentHeadTopicController::class, 'autoAssignTopicQuotas']);
            Route::get('/available-topics', [DepartmentHeadTopicController::class, 'getAvailableTopics']);
            Route::post('/assign-specific-topic', [DepartmentHeadTopicController::class, 'assignSpecificTopic']);
            Route::post('/assign-reviewers', [DepartmentHeadTopicController::class, 'assignReviewers']);
            Route::post('/auto-assign-reviewers', [DepartmentHeadTopicController::class, 'autoAssignReviewers']);
            Route::get('/available-topics-for-reviewers', [DepartmentHeadTopicController::class, 'getTopicsForReviewers']);
        });

        Route::prefix('detai')->group(function () {
            Route::get('/', [DepartmentHeadDetaiController::class, 'index']);
            Route::get('/pending', [DepartmentHeadDetaiController::class, 'getPendingTopics']);
            Route::get('/statistics', [DepartmentHeadDetaiController::class, 'getStatistics']);
            Route::get('/available/supervisors', [DetaiController::class, 'getSupervisorsByPlan']);
            Route::get('/{id}', [DepartmentHeadDetaiController::class, 'show']);
            Route::post('/{id}/approve-reject', [DepartmentHeadDetaiController::class, 'approveOrReject']);
        });
    });

    // =================================================================================
    // J. KHU VỰC GIẢNG VIÊN
    // =================================================================================
    Route::prefix('giangvien')->group(function () {
        Route::get('/dashboard-stats', [LecturerDashboardController::class, 'getDashboardStats']); 
        Route::get('/my-hoidong', [HoiDongController::class, 'getHoiDongByGiangVien']);

        Route::prefix('quotas')->group(function () {
            Route::get('/lecturers', [LecturerQuotaController::class, 'getLecturers']);
            Route::post('/assign-lecturer-quota', [LecturerQuotaController::class, 'assignLecturerQuota']);
            Route::post('/auto-assign-lecturer-quotas', [LecturerQuotaController::class, 'autoAssignLecturerQuotas']);
            Route::get('/my-quota', [LecturerQuotaController::class, 'getMyQuota']);
        });

        Route::prefix('topic-assignments')->group(function () {
            Route::get('/lecturers', [LecturerTopicController::class, 'getLecturers']);
            Route::post('/assign-topic-quota', [LecturerTopicController::class, 'assignTopicQuota']);
            Route::post('/auto-assign-topic-quotas', [LecturerTopicController::class, 'autoAssignTopicQuotas']);
            Route::get('/available-topics', [LecturerTopicController::class, 'getAvailableTopics']);
            Route::post('/assign-specific-topic', [LecturerTopicController::class, 'assignSpecificTopic']);
            Route::post('/assign-reviewers', [LecturerTopicController::class, 'assignReviewers']);
            Route::post('/auto-assign-reviewers', [LecturerTopicController::class, 'autoAssignReviewers']);
        });
        
        Route::prefix('submissions')->group(function () {
            Route::get('/', [AdminSubmissionController::class, 'index']); 
            Route::get('/{submission}', [AdminSubmissionController::class, 'show']); 
            Route::post('/{submission}/confirm', [AdminSubmissionController::class, 'confirmSubmission']); 
            Route::post('/{submission}/reject', [AdminSubmissionController::class, 'rejectSubmission']); 
        });
    });

    // Lịch làm việc Giảng viên
    Route::prefix('lecturer/calendar')->group(function () {
        Route::get('/groups', [LichHopController::class, 'getLecturerGroups']);
        Route::get('/events', [LichHopController::class, 'getLecturerSchedule']);
        Route::post('/create-quick', [LichHopController::class, 'createQuickMeeting']);
        Route::put('/rate/{id}', [LichHopController::class, 'rateMeeting']);
    });

    // =================================================================================
    // K. CHẤM ĐIỂM (Hội đồng & GV)
    // =================================================================================
    Route::prefix('chamdiem')->group(function () {
        Route::get('/statistics', [ChamDiemController::class, 'getGradingStatistics']);
        Route::get('/groups-grading', [ChamDiemController::class, 'getGroupsForGrading']);
        Route::get('/my-tasks', [ChamDiemController::class, 'getMyGradingTasks']);
        Route::get('/nhom/{id}', [ChamDiemController::class, 'getNhom']);
        Route::get('/tytrong', [ChamDiemController::class, 'getTyTrong']);
        Route::post('/tytrong', [ChamDiemController::class, 'capNhatTyTrong']);
        Route::post('/huongdan/{nhom}', [ChamDiemController::class, 'saveDiemHuongDan']);
        Route::post('/phanbien/{nhom}', [ChamDiemController::class, 'saveDiemPhanBien']);
        Route::post('/hoidong/{nhom}', [ChamDiemController::class, 'saveDiemHoiDong']);
        Route::post('/combined/{nhom}', [ChamDiemController::class, 'saveCombined']);
        Route::get('/tongket/{id}', [ChamDiemController::class, 'getTong']);
        Route::post('/phanbien/{nhom}/reject', [ChamDiemController::class, 'submitZeroPhanBien']);
        Route::get('/students-grading', [ChamDiemController::class, 'getStudentGradingList']);
        Route::get('/student-statistics', [ChamDiemController::class, 'getStudentGradingStatistics']);
    });
});

// Fallback cho các route không tồn tại
Route::fallback(function () {
    return response()->json(['message' => 'Not Found!'], 404);
});