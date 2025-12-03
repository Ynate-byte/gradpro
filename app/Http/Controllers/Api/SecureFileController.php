<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FileNopSanpham;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Gate;

class SecureFileController extends Controller
{
    public function download($fileId)
    {
        $file = FileNopSanpham::with('nopSanpham.phancong.nhom')->findOrFail($fileId);
        
        if (in_array($file->LOAI_FILE, ['LinkDemo', 'LinkRepository'])) {
            return response()->json(['message' => 'Đây là liên kết, không phải file.'], 400);
        }

        $nhom = $file->nopSanpham->phancong->nhom;
        $this->authorize('view', $nhom);

        if (!Storage::disk('local')->exists($file->DUONG_DAN_HOAC_NOI_DUNG)) {
            return response()->json(['message' => 'File không tồn tại trên hệ thống.'], 404);
        }

        return Storage::disk('local')->download($file->DUONG_DAN_HOAC_NOI_DUNG, $file->TEN_FILE_GOC);
    }
}