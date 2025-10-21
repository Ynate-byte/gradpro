<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MauKehoach;
use Illuminate\Http\Request;

class ThesisPlanTemplateController extends Controller
{
    /**
     * Lấy danh sách các bản mẫu (chỉ tên và ID).
     */
    public function index()
    {
        return MauKehoach::orderBy('TEN_MAU')->get(['ID_MAU', 'TEN_MAU']);
    }

    /**
     * Lấy chi tiết một bản mẫu kèm các mốc thời gian.
     */
    public function show($id) // Không dùng Route Model Binding ở đây để trả 404 nếu không tìm thấy
    {
         $template = MauKehoach::with(['mauMocThoigians' => function ($query) {
            $query->orderBy('THU_TU'); // Đảm bảo mốc thời gian đúng thứ tự
        }])->find($id);

        if (!$template) {
            return response()->json(['message' => 'Không tìm thấy bản mẫu.'], 404);
        }

        return $template;
    }
}