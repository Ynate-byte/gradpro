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

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // User Management Routes
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

    // Student Grouping Routes
    Route::get('/student/my-active-plans', [NhomController::class, 'getActivePlansForStudent']);
    Route::get('/nhom/my-group', [NhomController::class, 'getMyGroup']);
    Route::post('/nhom', [NhomController::class, 'createGroup']);
    Route::post('/nhom/{nhom}/invite', [NhomController::class, 'inviteMember']);
    Route::get('/nhom/find', [NhomController::class, 'findGroups']);
    Route::post('/nhom/{nhom}/request-join', [NhomController::class, 'requestToJoin']);
    Route::post('/nhom/{nhom}/requests/{yeucau}/handle', [NhomController::class, 'handleJoinRequest']);
    Route::post('/nhom/leave', [NhomController::class, 'leaveGroup']);

    // Invitations & Notifications Routes
    Route::get('/invitations', [InvitationController::class, 'getPendingInvitations']);
    Route::post('/invitations/{loimoi}/handle', [InvitationController::class, 'handleInvitation']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/mark-as-read', [NotificationController::class, 'markAsRead']);

    // Admin Panel Routes
    Route::prefix('admin')->middleware(['auth:sanctum'])->group(function () {
        // Thesis Plans
        Route::get('thesis-plans/list-all', [ThesisPlanController::class, 'getAllPlans']); // THÊM ROUTE MỚI
        Route::post('thesis-plans/preview-new', [ThesisPlanController::class, 'previewNewPlan']);
        Route::apiResource('thesis-plans', ThesisPlanController::class)->parameters(['thesis-plans' => 'plan']);
        Route::post('thesis-plans/{plan}/submit-approval', [ThesisPlanController::class, 'submitForApproval']);
        Route::post('thesis-plans/{plan}/approve', [ThesisPlanController::class, 'approve']);
        Route::post('thesis-plans/{plan}/request-changes', [ThesisPlanController::class, 'requestChanges']);
        Route::get('thesis-plans/{plan}/export-document', [ThesisPlanController::class, 'exportDocument']);
        Route::get('thesis-plans/{plan}/preview-document', [ThesisPlanController::class, 'previewDocument']);
        
        // === BẮT ĐẦU SỬA ĐỔI: Chuyển Group Management ra ngoài ===
        Route::prefix('groups')->group(function () {
            Route::get('/', [GroupAdminController::class, 'getGroups']);
            Route::get('/statistics', [GroupAdminController::class, 'getStatistics']);
            Route::get('/inactive-students', [GroupAdminController::class, 'getInactiveStudents']);
            Route::post('/remove-students', [GroupAdminController::class, 'removeStudents']);
            Route::post('/auto-group', [GroupAdminController::class, 'autoGroupStudents']);
            Route::get('/export', [GroupAdminController::class, 'exportGroups']);
            Route::post('/add-student', [GroupAdminController::class, 'addStudentToGroup']);
            // Routes với {nhom} có thể để chung hoặc để riêng, để đây cho gọn
            Route::put('/{nhom}', [GroupAdminController::class, 'update']);
            Route::delete('/{nhom}', [GroupAdminController::class, 'destroy']);
            Route::post('/{nhom}/mark-special', [GroupAdminController::class, 'markAsSpecial']);
        });
        // === KẾT THÚC SỬA ĐỔI ===
    });
});