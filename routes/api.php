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
use App\Http\Controllers\Api\ThesisPlanTemplateController as UserTemplateController;

// Route Đăng nhập công khai
Route::post('/login', [AuthController::class, 'login']);

// Nhóm Routes yêu cầu xác thực (auth:sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Quản lý CRUD người dùng
    Route::apiResource('users', UserController::class);
    // Các hành động hàng loạt
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

    // --- Routes Quản lý Nhóm Sinh viên ---
    Route::prefix('nhom')->group(function () {
        Route::get('/my-group', [NhomController::class, 'getMyGroup']);
        Route::post('/', [NhomController::class, 'createGroup']);
        Route::post('/{nhom}/invite', [NhomController::class, 'inviteMember']);
        Route::get('/find', [NhomController::class, 'findGroups']);
        Route::post('/{nhom}/request-join', [NhomController::class, 'requestToJoin']);
        Route::post('/{nhom}/requests/{yeucau}/handle', [NhomController::class, 'handleJoinRequest']);
        Route::post('/leave', [NhomController::class, 'leaveGroup']);
        Route::post('/{nhom}/transfer-leadership/{newLeaderId}', [NhomController::class, 'transferLeadership']);
    });

    // Lấy danh sách các kế hoạch đang hoạt động mà sinh viên tham gia
    Route::get('/student/my-active-plans', [NhomController::class, 'getActivePlansForStudent']);

    // --- Routes Lời mời & Thông báo ---
    Route::get('/invitations', [InvitationController::class, 'getPendingInvitations']);
    Route::post('/invitations/{loimoi}/handle', [InvitationController::class, 'handleInvitation']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/mark-as-read', [NotificationController::class, 'markAsRead']);

    // --- Routes Kế hoạch Mẫu (Dành cho người dùng) ---
    Route::get('thesis-plan-templates', [UserTemplateController::class, 'index']);
    Route::get('thesis-plan-templates/{id}', [UserTemplateController::class, 'show']);

    // --- Routes dành cho Quản trị viên ---
    Route::prefix('admin')->middleware(['auth:sanctum'])->group(function () {
        
        // --- Quản lý Kế hoạch Khóa luận ---
        Route::get('thesis-plans/list-all', [ThesisPlanController::class, 'getAllPlans']);
        Route::post('thesis-plans/preview-new', [ThesisPlanController::class, 'previewNewPlan']);
        Route::apiResource('thesis-plans', ThesisPlanController::class)->parameters(['thesis-plans' => 'plan']);
        Route::post('thesis-plans/{plan}/submit-approval', [ThesisPlanController::class, 'submitForApproval']);
        Route::post('thesis-plans/{plan}/approve', [ThesisPlanController::class, 'approve']);
        Route::post('thesis-plans/{plan}/request-changes', [ThesisPlanController::class, 'requestChanges']);
        Route::get('thesis-plans/{plan}/export-document', [ThesisPlanController::class, 'exportDocument']);
        Route::get('thesis-plans/{plan}/preview-document', [ThesisPlanController::class, 'previewDocument']);

        // --- Quản lý Nhóm ---
        Route::prefix('groups')->group(function () {
            Route::get('/', [GroupAdminController::class, 'getGroups']);
            Route::get('/statistics', [GroupAdminController::class, 'getStatistics']);
            Route::get('/inactive-students', [GroupAdminController::class, 'getInactiveStudents']);
            Route::get('/search-ungrouped-students', [GroupAdminController::class, 'searchUngroupedStudents']);
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

        // --- Quản lý Kế hoạch Mẫu (Admin) ---
        // Quản lý CRUD Kế hoạch Mẫu
        Route::apiResource('thesis-plan-templates', AdminTemplateController::class)
            ->parameters(['thesis-plan-templates' => 'template']);
    });
});