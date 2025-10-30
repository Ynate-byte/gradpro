<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\NhomController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Admin\GroupAdminController;
use App\Http\Controllers\Api\Admin\ThesisPlanController;
use App\Http\Controllers\Api\Admin\ThesisPlanTemplateController as AdminTemplateController;
use App\Http\Controllers\Api\Admin\DetaiAdminController;
use App\Http\Controllers\Api\ThesisPlanTemplateController as UserTemplateController;
use App\Http\Controllers\Api\DetaiController;
use App\Models\YeucauVaoNhom;

// Route Đăng nhập công khai
Route::post('/login', [AuthController::class, 'login']);

// Nhóm Routes yêu cầu xác thực (auth:sanctum)
Route::middleware('auth:sanctum')->group(function () {
   Route::post('/logout', [AuthController::class, 'logout']);

   // --User routes ---
   Route::apiResource('users', UserController::class);
   Route::post('users/bulk-action', [UserController::class, 'bulkAction']);
   Route::post('users/bulk-delete', [UserController::class, 'bulkDelete']);
   Route::post('users/bulk-reset-password', [UserController::class, 'bulkResetPassword']);
   Route::post('users/{id}/reset-password', [UserController::class, 'resetPassword']);
   Route::get('roles', [UserController::class, 'getRoles']);
   Route::get('chuyen-nganhs', [UserController::class, 'getChuyenNganhs']);
   Route::get('khoa-bo-mons', [UserController::class, 'getKhoaBomons']);
   Route::get('/users/import/template', [UserController::class, 'downloadImportTemplate']);
   Route::post('/users/import/preview', [UserController::class, 'previewImport']);
   Route::post('/users/import/process', [UserController::class, 'processImport']);

   // --Routes Quản lý Nhóm Sinh viên ---
   Route::prefix('nhom')->group(function () {
       Route::get('/my-group', [NhomController::class, 'getMyGroup']);
       Route::post('/', [NhomController::class, 'createGroup']);
       Route::post('/{nhom}/invite', [NhomController::class, 'inviteMember']);
       Route::get('/find', [NhomController::class, 'findGroups']);
       Route::post('/{nhom}/request-join', [NhomController::class, 'requestToJoin']);
       Route::post('/{nhom}/requests/{yeucau}/handle', [NhomController::class, 'handleJoinRequest']);
       Route::post('/leave', [NhomController::class, 'leaveGroup']);
       Route::post('/{nhom}/transfer-leadership/{newLeaderId}', [NhomController::class, 'transferLeadership']);
       Route::post('/{nhom}/invitations/{loimoi}/cancel', [NhomController::class, 'cancelInvitation']);
   });
   Route::post('/requests/{yeucau}/cancel', [NhomController::class, 'cancelJoinRequest']);
   Route::get('/student/my-active-plans', [NhomController::class, 'getActivePlansForStudent']);

   // --Routes Lời mời & Thông báo ---
   Route::get('/invitations', [InvitationController::class, 'getPendingInvitations']);
   Route::post('/invitations/{loimoi}/handle', [InvitationController::class, 'handleInvitation']);
   Route::get('/notifications', [NotificationController::class, 'index']);
   Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
   Route::post('/notifications/mark-as-read', [NotificationController::class, 'markAsRead']);

   // --Routes Tin Tức (News) ---
   Route::get('/news', [\App\Http\Controllers\Api\NewsController::class, 'index']);
   Route::post('/news', [\App\Http\Controllers\Api\NewsController::class, 'store']);
   Route::get('/news/{id}', [\App\Http\Controllers\Api\NewsController::class, 'show']);
   Route::post('/news/{id}', [\App\Http\Controllers\Api\NewsController::class, 'update']);
   Route::delete('/news/{id}', [\App\Http\Controllers\Api\NewsController::class, 'destroy']);
   Route::get('/news/{id}/pdf', [\App\Http\Controllers\Api\NewsController::class, 'pdf']);

   // --Routes Kế hoạch Mẫu (Dành cho người dùng) ---
   Route::get('thesis-plan-templates', [UserTemplateController::class, 'index']);
   Route::get('thesis-plan-templates/{id}', [UserTemplateController::class, 'show']);

   // --Routes Quản lý Đề tài ---
   Route::prefix('detai')->group(function () {
       Route::get('/', [DetaiController::class, 'index']);
       Route::post('/', [DetaiController::class, 'store']);
       Route::get('/{id}', [DetaiController::class, 'show']);
       Route::put('/{id}', [DetaiController::class, 'update']);
       Route::delete('/{id}', [DetaiController::class, 'destroy']);
       Route::post('/{id}/submit-approval', [DetaiController::class, 'submitForApproval']);
       Route::post('/{id}/approve-reject', [DetaiController::class, 'approveOrReject']);
       Route::post('/{id}/suggestions', [DetaiController::class, 'addSuggestion']);
       Route::get('/available/for-registration', [DetaiController::class, 'getAvailableTopics']);
       Route::post('/{topicId}/register-group', [DetaiController::class, 'registerGroup']);
       Route::get('/registered-groups', [DetaiController::class, 'getRegisteredGroups']);
       Route::get('/supervised', [DetaiController::class, 'getSupervisedTopics']);
       Route::get('/my-registered-topic', [DetaiController::class, 'getMyRegisteredTopic']);
       Route::get('/giangvien/groups', [DetaiController::class, 'getGroupsForLecturer']);
   });

   // Route kiểm tra trưởng nhóm
   Route::get('/check-group-leader', [DetaiController::class, 'isGroupLeader']);
   Route::get('/group-status', [DetaiController::class, 'groupStatus']);

   // Route lấy chi tiết nhóm
   Route::get('/groups/{id}', [NhomController::class, 'getGroupById']);

   // --Routes dành cho Quản trị viên (Admin, Trưởng khoa, Giáo vụ) ---
   // ----SỬA LỖI: Xóa middleware lồng nhau -----
   Route::prefix('admin')->group(function () { 
   // ----KẾT THÚC SỬA LỖI -----

       // --Quản lý Kế hoạch Khóa luận ---
       Route::get('thesis-plans/list-all', [ThesisPlanController::class, 'getAllPlans']);
       Route::post('thesis-plans/preview-new', [ThesisPlanController::class, 'previewNewPlan']);
       Route::apiResource('thesis-plans', ThesisPlanController::class)->parameters(['thesis-plans' => 'plan']);
       Route::post('thesis-plans/{plan}/submit-approval', [ThesisPlanController::class, 'submitForApproval']);
       Route::post('thesis-plans/{plan}/approve', [ThesisPlanController::class, 'approve']);
       Route::post('thesis-plans/{plan}/request-changes', [ThesisPlanController::class, 'requestChanges']);
       Route::get('thesis-plans/{plan}/export-document', [ThesisPlanController::class, 'exportDocument']);
       Route::get('thesis-plans/{plan}/preview-document', [ThesisPlanController::class, 'previewDocument']);
       Route::post('thesis-plans/{plan}/activate', [ThesisPlanController::class, 'activatePlan']);

       // --Routes quản lý sinh viên tham gia ---
       Route::prefix('thesis-plans/{plan}/participants')->group(function () {
           Route::get('/', [ThesisPlanController::class, 'getParticipants'])->name('admin.plans.participants.index');
           Route::post('/', [ThesisPlanController::class, 'addParticipants'])->name('admin.plans.participants.store');
           Route::put('/{sinhvienThamgia}', [ThesisPlanController::class, 'updateParticipant'])->name('admin.plans.participants.update');
           Route::delete('/{sinhvienThamgia}', [ThesisPlanController::class, 'removeParticipant'])->name('admin.plans.participants.destroy');
           Route::post('/bulk-remove', [ThesisPlanController::class, 'bulkRemoveParticipants'])->name('admin.plans.participants.bulkRemove');
       });
       Route::get('thesis-plans/{plan}/search-students', [ThesisPlanController::class, 'searchStudentsForPlan'])->name('admin.plans.searchStudents');

       // --Quản lý Nhóm ---
       Route::prefix('groups')->group(function () {
           Route::get('/', [GroupAdminController::class, 'getGroups']);
           Route::get('/statistics', [GroupAdminController::class, 'getStatistics']);
           Route::get('/inactive-students', [GroupAdminController::class, 'getInactiveStudents']);
           Route::get('/searchungrouped-students', [GroupAdminController::class, 'searchUngroupedStudents']);
           Route::post('/create-with-members', [GroupAdminController::class, 'createWithMembers']);
           Route::post('/remove-students', [GroupAdminController::class, 'removeStudents']);
           Route::post('/auto-group', [GroupAdminController::class, 'autoGroupStudents']);
           Route::get('/export', [GroupAdminController::class, 'exportGroups']);
           Route::get('/ungrouped-students', [GroupAdminController::class, 'getUngroupedStudents']);
           Route::post('/add-members', [GroupAdminController::class, 'addMembersToGroup']);
           Route::put('/{nhom}', [GroupAdminController::class, 'update']);
           Route::delete('/{nhom}', [GroupAdminController::class, 'destroy']);
           Route::post('/{nhom}/mark-special', [GroupAdminController::class, 'markAsSpecial']);
           Route::post('/{nhom}/remove-member/{userId}', [GroupAdminController::class, 'removeMember']);
       });

       // --Quản lý Kế hoạch Mẫu (Admin) ---
       Route::apiResource('thesis-plan-templates', AdminTemplateController::class)
           ->parameters(['thesis-plan-templates' => 'template']);

       // --Quản lý Đề tài (Admin) ---
       Route::prefix('detai')->group(function () {
           Route::get('/', [DetaiAdminController::class, 'index']);
           Route::get('/pending', [DetaiAdminController::class, 'getPendingTopics']);
           Route::get('/statistics', [DetaiAdminController::class, 'getStatistics']);
           Route::get('/{id}', [DetaiAdminController::class, 'show']);
           Route::post('/{id}/approve-reject', [DetaiAdminController::class, 'approveOrReject']);
       });
   });
});

// Route dự phòng
Route::fallback(function () {
   return response()->json(['message' => 'Not Found!'], 404);
});