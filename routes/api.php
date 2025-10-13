<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/user', function (Request $request) {
        return $request->user()->load(['vaitro', 'sinhvien.chuyennganh', 'giangvien.khoabomon']);
    });

    Route::get('/roles', [UserController::class, 'getRoles']);
    Route::get('/chuyen-nganhs', [UserController::class, 'getChuyenNganhs']);
    Route::get('/khoa-bo-mons', [UserController::class, 'getKhoaBomons']);

    Route::get('/users/import/template', [UserController::class, 'downloadImportTemplate']);
    Route::post('/users/import/preview', [UserController::class, 'previewImport']);
    Route::post('/users/import/process', [UserController::class, 'processImport']);

    Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword']);
    
    Route::post('/users/bulk-action', [UserController::class, 'bulkAction']);
    Route::post('/users/bulk-delete', [UserController::class, 'bulkDelete']);

    Route::apiResource('users', UserController::class);
});