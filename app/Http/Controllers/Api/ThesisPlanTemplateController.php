<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MauKehoach;
use Illuminate\Http\Request;

class ThesisPlanTemplateController extends Controller
{
    // QUẢN LÝ MẪU KẾ HOẠCH (CHO SINH VIÊN)

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
    public function show($id)
    {
         $template = MauKehoach::with(['mauMocThoigians' => function ($query) {
            $query->orderBy('THU_TU');
        }])->find($id);

        if (!$template) {
            return response()->json(['message' => 'Không tìm thấy bản mẫu.'], 404);
        }

        return $template;
    }
}
