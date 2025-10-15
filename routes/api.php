<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\NhomController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\NotificationController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    Route::apiResource('users', UserController::class);
    Route::post('users/bulk-action', [UserController::class, 'bulkAction']);
    Route::post('users/bulk-delete', [UserController::class, 'bulkDelete']);
    Route::post('users/{id}/reset-password', [UserController::class, 'resetPassword']);
    Route::get('roles', [UserController::class, 'getRoles']);
    Route::get('chuyen-nganhs', [UserController::class, 'getChuyenNganhs']);
    Route::get('khoa-bo-mons', [UserController::class, 'getKhoaBomons']);
    Route::get('/users/import/template', [UserController::class, 'downloadImportTemplate']);
    Route::post('/users/import/preview', [UserController::class, 'previewImport']);
    Route::post('/users/import/process', [UserController::class, 'processImport']);

    Route::get('/nhom/my-group', [NhomController::class, 'getMyGroup']);
    Route::post('/nhom', [NhomController::class, 'createGroup']);
    Route::post('/nhom/{nhom}/invite', [NhomController::class, 'inviteMember']);
    Route::get('/nhom/find', [NhomController::class, 'findGroups']);
    Route::post('/nhom/{nhom}/request-join', [NhomController::class, 'requestToJoin']);
    Route::post('/nhom/{nhom}/requests/{yeucau}/handle', [NhomController::class, 'handleJoinRequest']);
    Route::post('/nhom/leave', [NhomController::class, 'leaveGroup']);

    Route::get('/invitations', [InvitationController::class, 'getPendingInvitations']);
    Route::post('/invitations/{loimoi}/handle', [InvitationController::class, 'handleInvitation']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/mark-as-read', [NotificationController::class, 'markAsRead']);
});