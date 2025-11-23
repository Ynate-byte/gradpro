<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\GoiyDetai;
use App\Models\PhancongDetaiNhom;
use App\Models\Nhom;
use App\Models\Giangvien;
use App\Models\ThanhvienNhom;
use App\Models\PhancongNguoiGopY;
use App\Imports\TopicsImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use App\Services\ActivityLogger;

class DetaiController extends Controller
{
    /**
     * Hiển thị danh sách đề tài khóa luận.
     */
    public function index(Request $request)
    {
        // 1. Eager Loading: Tải trước các quan hệ cần thiết
        $query = Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'kehoachKhoaluan',
            'phancongDetaiNhom.nhom.thanhvienNhom.nguoidung',
            'phancongDetaiNhom.nhom.nhomtruong',
            'phancong_nguoi_gop_y.giangvien.nguoidung',
            'goiyDetai' => function ($query) {
                $query->with('giangvien.nguoidung');
            }
        ]);

        $currentUser = Auth::user();
        $isLecturer = $currentUser->giangvien ? true : false;
        $lecturerId = $currentUser->giangvien->ID_GIANGVIEN ?? null;

        // --- LOGIC CHO SINH VIÊN ---
        if ($currentUser->vaitro->TEN_VAITRO === 'Sinh viên') {
            // Sinh viên chỉ được xem các đề tài đã duyệt
            $query->where('TRANGTHAI', 'Đã duyệt');
            
            // Lọc theo kế hoạch nếu có
            if ($request->has('plan_id')) {
                $query->where('ID_KEHOACH', $request->plan_id);
            }
        } 
        // --- LOGIC CHO GIẢNG VIÊN / ADMIN / GIÁO VỤ ---
        else if ($isLecturer || $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa()) {
            
            // Lọc theo Kế hoạch (Bắt buộc để đúng ngữ cảnh)
            if ($request->has('plan_id')) {
                $query->where('ID_KEHOACH', $request->plan_id);
            }

            // [QUAN TRỌNG] Xử lý Filter Mode (Server-side filtering)
            if ($lecturerId) {
                $filterMode = $request->input('filter_mode', 'all'); // Mặc định là 'all'

                if ($filterMode === 'review') {
                    // MODE: Cần góp ý (Review)
                    // Chỉ lấy các đề tài mà giảng viên này có trong danh sách phân công góp ý
                    $query->whereHas('phancong_nguoi_gop_y', function ($subQ) use ($lecturerId) {
                        $subQ->where('ID_GIANGVIEN', $lecturerId);
                    });
                } 
                elseif ($filterMode === 'my') {
                    // MODE: Đề tài của tôi
                    // Chỉ lấy đề tài do chính giảng viên đề xuất
                    $query->where('ID_NGUOI_DEXUAT', $lecturerId);
                } 
                else {
                    // MODE: Tất cả (All)
                    // Lấy: 
                    // 1. Đề tài KHÔNG PHẢI NHÁP (của người khác)
                    // 2. Đề tài CỦA TÔI (kể cả Nháp)
                    // 3. Đề tài ĐƯỢC PHÂN CÔNG GÓP Ý (kể cả Nháp nếu được gán)
                    
                    $query->where(function ($q) use ($lecturerId) {
                        // Nhóm 1: Của người khác nhưng không phải Nháp
                        $q->where('ID_NGUOI_DEXUAT', '!=', $lecturerId)
                          ->where('TRANGTHAI', '!=', 'Nháp');
                          
                        // Nhóm 2: Của tôi (lấy hết)
                        $q->orWhere('ID_NGUOI_DEXUAT', $lecturerId);
                        
                        // Nhóm 3: Được phân công review (lấy hết)
                        $q->orWhereHas('phancong_nguoi_gop_y', function ($subQ) use ($lecturerId) {
                            $subQ->where('ID_GIANGVIEN', $lecturerId);
                        });
                    });
                }
            } else {
                // Nếu là Admin thuần (không phải GV), mặc định ẩn Nháp của người khác
                // (Trừ khi Admin muốn xem hết để quản lý, ở đây giả sử Admin xem như GV thường nhưng quyền cao hơn)
                $query->where('TRANGTHAI', '<>', 'Nháp');
            }

            // Lọc theo Trạng thái (nếu có)
            if ($request->has('status') && $request->status !== 'Tất cả') {
                if (is_array($request->status)) {
                    $query->whereIn('TRANGTHAI', $request->status);
                } else {
                    $query->where('TRANGTHAI', $request->status);
                }
            }

            // Lọc theo ID Giảng viên cụ thể (nếu cần)
            if ($request->has('lecturer_id') && $request->lecturer_id !== $lecturerId) {
                $query->where('ID_NGUOI_DEXUAT', $request->lecturer_id);
            }

            // Lọc theo Chuyên ngành
            if ($request->has('major_id')) {
                $query->where('ID_CHUYENNGANH', $request->major_id);
            }
        }

        // --- TÌM KIẾM (SEARCH) ---
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('TEN_DETAI', 'like', '%' . $search . '%')
                  ->orWhere('MA_DETAI', 'like', '%' . $search . '%')
                  ->orWhereHas('nguoiDexuat.nguoidung', function ($subQ) use ($search) {
                      $subQ->where('HODEM_VA_TEN', 'like', '%' . $search . '%');
                  });
            });
        }

        $topics = $query->orderBy('NGAYTAO', 'desc')
                        ->paginate($request->input('per_page', 10));

        $topics->getCollection()->transform(function ($topic) {
            $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
            return $topic;
        });

        return response()->json($topics);
    }

    // ... (Các hàm khác giữ nguyên như file gốc của bạn) ...
    
    /**
     * Lấy danh sách đề tài đã duyệt của giảng viên đang đăng nhập
     */
    public function getApprovedTopicsOfLecturer(Request $request)
    {
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;

        if (!$lecturer) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        $query = Detai::with(['kehoachKhoaluan', 'chuyennganh'])
            ->where('TRANGTHAI', 'Đã duyệt')
            ->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN)
            ->select('DETAI.*') // cần select để groupBy hoạt động đúng
            ->groupBy('DETAI.ID_DETAI'); // Quan trọng: chỉ lấy mỗi đề tài 1 lần

        $topics = $query->orderBy('TEN_DETAI', 'asc')->get();

        return response()->json($topics);
    }

    /**
     * Tái sử dụng đề tài đã duyệt cho một kế hoạch khác
     * Body params: existing_topic_id, new_plan_id
     */
    public function reuseApprovedTopic(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'existing_topic_id' => 'required|integer|exists:DETAI,ID_DETAI',
            'new_plan_id' => 'required|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;

        if (!$lecturer) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        $existingTopic = Detai::findOrFail($request->existing_topic_id);

        // Chỉ được reuse nếu trạng thái đề tài là Đã duyệt và thuộc giảng viên hiện tại
        if ($existingTopic->TRANGTHAI !== 'Đã duyệt' || $existingTopic->ID_NGUOI_DEXUAT != $lecturer->ID_GIANGVIEN) {
            return response()->json(['message' => 'Chỉ có thể tái sử dụng đề tài đã duyệt của chính bạn'], 403);
        }

        // Tạo đề tài mới copy dữ liệu từ đề tài cũ nhưng kế hoạch mới và trạng thái Đã duyệt
        $newTopic = Detai::create([
            'ID_KEHOACH' => $request->new_plan_id,
            'MA_DETAI' => 'DT' . date('Y') . strtoupper(substr(md5(uniqid()), 0, 6)),
            'TEN_DETAI' => $existingTopic->TEN_DETAI,
            'MOTA' => $existingTopic->MOTA,
            'ID_CHUYENNGANH' => $existingTopic->ID_CHUYENNGANH,
            'YEUCAU' => $existingTopic->YEUCAU,
            'MUCTIEU' => $existingTopic->MUCTIEU,
            'KETQUA_MONGDOI' => $existingTopic->KETQUA_MONGDOI,
            'ID_NGUOI_DEXUAT' => $lecturer->ID_GIANGVIEN,
            'SO_NHOM_TOIDA' => $existingTopic->SO_NHOM_TOIDA,
            'TRANGTHAI' => 'Đã duyệt',
            'NGAY_DUYET' => now(),
            'ID_NGUOI_DUYET' => $currentUser->ID_NGUOIDUNG,
        ]);

        ActivityLogger::log(
            'REUSE_TOPIC',
            "Tái sử dụng đề tài: {$existingTopic->TEN_DETAI} sang kế hoạch ID: {$request->new_plan_id}",
            ['original_topic_id' => $existingTopic->ID_DETAI, 'new_topic_id' => $newTopic->ID_DETAI],
            null,
            'FileText'
        );

        return response()->json($newTopic, 201);
    }

    /**
     * Lưu một đề tài khóa luận mới.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            'TEN_DETAI' => 'required|string|max:255',
            'MOTA' => 'required|string',
            'ID_CHUYENNGANH' => 'nullable|exists:CHUYENNGANH,ID_CHUYENNGANH',
            'YEUCAU' => 'nullable|string',
            'MUCTIEU' => 'nullable|string',
            'KETQUA_MONGDOI' => 'nullable|string',
            'SO_NHOM_TOIDA' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Lấy giảng viên hiện tại
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien; // Sử dụng quan hệ

        if (!$lecturer) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        // Tạo mã đề tài ngẫu nhiên
        $topicCode = 'DT' . date('Y') . strtoupper(substr(md5(uniqid()), 0, 6));

        $topic = Detai::create([
            'ID_KEHOACH' => $request->ID_KEHOACH,
            'MA_DETAI' => $topicCode,
            'TEN_DETAI' => $request->TEN_DETAI,
            'MOTA' => $request->MOTA,
            'ID_CHUYENNGANH' => $request->ID_CHUYENNGANH,
            'YEUCAU' => $request->YEUCAU,
            'MUCTIEU' => $request->MUCTIEU,
            'KETQUA_MONGDOI' => $request->KETQUA_MONGDOI,
            'ID_NGUOI_DEXUAT' => $lecturer->ID_GIANGVIEN,
            'SO_NHOM_TOIDA' => $request->SO_NHOM_TOIDA ?? 1,
            'TRANGTHAI' => 'Nháp',
        ]);

        ActivityLogger::log(
            'PROPOSE_TOPIC',
            "Đề xuất đề tài mới: {$topic->TEN_DETAI}",
            ['topic_code' => $topicCode],
            null,
            'FileText'
        );

        return response()->json($topic->load(['nguoiDexuat.nguoidung', 'chuyennganh']), 201);
    }

    /**
     * Hiển thị chi tiết đề tài khóa luận
     */
    public function show($id)
    {
        $topic = Detai::with([
            'nguoiDexuat.nguoidung',
            'chuyennganh',
            'kehoachKhoaluan',
            'goiyDetai' => function ($query) {
                $query->with([
                        'giangvien.nguoidung', // Người góp ý
                        'phanhois.giangvien.nguoidung' // Những người phản hồi
                       ])
                       ->orderBy('NGAYTAO', 'asc');
            },
            'phancongDetaiNhom.nhom.nhomtruong',
            'phancongDetaiNhom.nhom.thanhvienNhom.nguoidung',
            'phancong_nguoi_gop_y.giangvien.nguoidung'
        ])->findOrFail($id);

        // Kiểm tra nếu sinh viên chỉ được xem đề tài đã duyệt
        $currentUser = Auth::user();
        if ($currentUser->vaitro->TEN_VAITRO === 'Sinh viên' && $topic->TRANGTHAI !== 'Đã duyệt') {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        // Đảm bảo goiyDetai luôn là mảng
        $topic->goiyDetai = $topic->goiyDetai ?? [];

        // Thêm tên giảng viên để hiển thị
        $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';

        return response()->json($topic);
    }

    /**
     * Cập nhật đề tài khóa luận
     */
    public function update(Request $request, $id)
    {
        $topic = Detai::findOrFail($id);

        // Kiểm tra nếu người dùng là người đề xuất hoặc admin
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;

        $isProposer = $lecturer && $topic->ID_NGUOI_DEXUAT == $lecturer->ID_GIANGVIEN;
        // [CẬP NHẬT] Sử dụng helper isAdmin() thay vì check chuỗi
        $isAdmin = $this->isAdmin();

        if (!$isProposer && !$isAdmin) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        // Không thể cập nhật nếu đã được duyệt
        if ($topic->TRANGTHAI === 'Đã duyệt' && !$isAdmin) {
            return response()->json(['message' => 'Không thể cập nhật đề tài đã duyệt'], 403);
        }

        // Cho phép chỉnh sửa nếu trạng thái là "Đang chỉnh sửa"
        if ($topic->TRANGTHAI === 'Đang chỉnh sửa' && !$isAdmin) {
            if (!$isProposer) {
                return response()->json(['message' => 'Không thể cập nhật đề tài đang được chỉnh sửa bởi người dùng khác'], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'TEN_DETAI' => 'sometimes|required|string|max:255',
            'MOTA' => 'sometimes|required|string',
            'ID_CHUYENNGANH' => 'nullable|exists:CHUYENNGANH,ID_CHUYENNGANH',
            'YEUCAU' => 'nullable|string',
            'MUCTIEU' => 'nullable|string',
            'KETQUA_MONGDOI' => 'nullable|string',
            'SO_NHOM_TOIDA' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $topic->update($request->only([
            'TEN_DETAI', 'MOTA', 'ID_CHUYENNGANH', 'YEUCAU', 'MUCTIEU', 'KETQUA_MONGDOI', 'SO_NHOM_TOIDA'
        ]));

        // Nếu được cập nhật bởi người đề xuất, đặt lại trạng thái về nháp nếu bị từ chối
        if ($isProposer && $topic->TRANGTHAI === 'Yêu cầu chỉnh sửa') {
            $topic->update(['TRANGTHAI' => 'Nháp']);
        }

        // Nếu được cập nhật bởi người đề xuất và trạng thái là "Chờ duyệt", chuyển sang "Đang chỉnh sửa"
        if ($isProposer && $topic->TRANGTHAI === 'Chờ duyệt') {
            $topic->update(['TRANGTHAI' => 'Đang chỉnh sửa']);
        }

        // Nếu được cập nhật bởi người đề xuất và trạng thái là "Đang chỉnh sửa", chuyển lại thành "Chờ duyệt"
        if ($isProposer && $topic->TRANGTHAI === 'Đang chỉnh sửa') {
            $topic->update(['TRANGTHAI' => 'Chờ duyệt']);
        }

        ActivityLogger::log(
            'UPDATE_TOPIC',
            "Cập nhật đề tài: {$topic->TEN_DETAI}",
            ['topic_id' => $topic->ID_DETAI],
            null,
            'Edit'
        );

        return response()->json($topic->load(['nguoiDexuat.nguoidung', 'chuyennganh']));
    }

    /**
     * Gửi đề tài để phê duyệt
     */
    public function submitForApproval($id)
    {
        $topic = Detai::findOrFail($id);

        // Kiểm tra nếu người dùng là người đề xuất
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;

        $isProposer = $lecturer && $topic->ID_NGUOI_DEXUAT == $lecturer->ID_GIANGVIEN;
        // [CẬP NHẬT] Sử dụng helper isAdmin()
        $isAdmin = $this->isAdmin();

        if (!$isProposer && !$isAdmin) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        // Cho phép gửi từ trạng thái "Nháp" hoặc "Đang chỉnh sửa"
        if (!in_array($topic->TRANGTHAI, ['Nháp', 'Đang chỉnh sửa'])) {
            return response()->json(['message' => 'Đề tài phải ở trạng thái nháp hoặc đang chỉnh sửa để gửi duyệt'], 400);
        }

        if (!$topic->kehoachKhoaluan->isFeatureActive('GV_RA_DE')) {
             return response()->json(['message' => 'Chức năng gửi duyệt đề tài hiện đang đóng.'], 403);
        }
        
        $topic->update(['TRANGTHAI' => 'Chờ duyệt']);
        return response()->json(['message' => 'Đã gửi đề tài để phê duyệt.']);
    }

    /**
     * Duyệt hoặc từ chối đề tài (Chỉ Admin)
     */
    public function approveOrReject(Request $request, $id)
    {
        $currentUser = Auth::user();
        
        // [CẬP NHẬT] Sử dụng helper isAdmin()
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Không được phép'], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject',
            'reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $topic = Detai::findOrFail($id);

        if ($request->action === 'approve') {
            $topic->update([
                'TRANGTHAI' => 'Đã duyệt',
                'ID_NGUOI_DUYET' => $currentUser->ID_NGUOIDUNG,
                'NGAY_DUYET' => now(),
                'LYDO_TUCHOI' => null,
            ]);
        } else {
            $topic->update([
                'TRANGTHAI' => 'Yêu cầu chỉnh sửa',
                'LYDO_TUCHOI' => $request->reason,
            ]);
        }

        return response()->json(['message' => 'Đề tài đã ' . ($request->action === 'approve' ? 'được duyệt' : 'bị từ chối')]);
    }

    /**
     * Thêm góp ý cho đề tài
     */
    public function addSuggestion(Request $request, $id)
    {
        // Kiểm tra dữ liệu đầu vào
        $validator = Validator::make($request->all(), [
            'NOIDUNG_GOIY' => 'required|string|min:1|max:1000',
        ], [
            'NOIDUNG_GOIY.required' => 'Nội dung góp ý là bắt buộc',
            'NOIDUNG_GOIY.min' => 'Nội dung góp ý phải có ít nhất 1 ký tự',
            'NOIDUNG_GOIY.max' => 'Nội dung góp ý không được vượt quá 1000 ký tự',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Tìm đề tài
        $topic = Detai::findOrFail($id);

        // Lấy người dùng hiện tại
        $currentUser = Auth::user();

        // Kiểm tra nếu người dùng là giảng viên
        $lecturer = $currentUser->giangvien; // Sử dụng quan hệ
        if (!$lecturer) {
            return response()->json(['message' => 'Chỉ giảng viên mới có thể góp ý đề tài'], 403);
        }

        // Kiểm tra trạng thái đề tài
        if (!in_array($topic->TRANGTHAI, ['Nháp', 'Chờ duyệt', 'Đang chỉnh sửa', 'Yêu cầu chỉnh sửa'])) {
            return response()->json(['message' => 'Không thể góp ý cho đề tài đã được duyệt hoặc đã khóa.'], 403);
        }

        // Tạo góp ý
        $suggestion = GoiyDetai::create([
            'ID_DETAI' => $id,
            'ID_NGUOI_GOIY' => $lecturer->ID_GIANGVIEN,
            'ID_GIANGVIEN' => $lecturer->ID_GIANGVIEN,
            'NOIDUNG_GOIY' => $request->NOIDUNG_GOIY,
            'NGAYTAO' => now(),
        ]);

        $assignment = PhancongNguoiGopY::where('ID_DETAI', $id)
            ->where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
            ->first();

        // Nếu có phân công và trạng thái chưa hoàn thành -> Cập nhật thành Hoàn thành
        if ($assignment && $assignment->TRANGTHAI !== 'Hoàn thành') {
            $assignment->update(['TRANGTHAI' => 'Hoàn thành']);
        }

        // Nếu đề tài đang ở trạng thái "Chờ duyệt", chuyển sang "Đang chỉnh sửa"
        if ($topic->TRANGTHAI === 'Chờ duyệt') {
            $topic->update(['TRANGTHAI' => 'Đang chỉnh sửa']);
        }

        ActivityLogger::log(
            'ADD_SUGGESTION',
            "Góp ý cho đề tài: {$topic->TEN_DETAI}",
            ['content_preview' => substr($request->NOIDUNG_GOIY, 0, 50) . '...'],
            null,
            'MessageSquare'
        );

        // Tải lại các quan hệ cho phản hồi
        $suggestion->load(['giangvien.nguoidung']);

        return response()->json([
            'message' => 'Góp ý đã được gửi thành công',
            'suggestion' => $suggestion
        ], 201);
    }

    /**
     * Lấy các đề tài có sẵn cho sinh viên đăng ký
     */
    public function getAvailableTopics(Request $request)
    {
        $query = Detai::with(['nguoiDexuat.nguoidung', 'chuyennganh'])
            ->where('TRANGTHAI', 'Đã duyệt');

        // Lọc theo kế hoạch
        if ($request->has('plan_id')) {
            $query->where('ID_KEHOACH', $request->plan_id);
        }

        // Lọc theo chuyên ngành nếu được cung cấp
        if ($request->has('major_id')) {
            $query->where('ID_CHUYENNGANH', $request->major_id);
        }

        // Tìm kiếm theo tên
        if ($request->has('search')) {
            $query->where('TEN_DETAI', 'like', '%' . $request->search . '%');
        }

        $topics = $query->orderBy('NGAYTAO', 'desc')->paginate(10);

        return response()->json($topics);
    }

    /**
     * Đăng ký nhóm cho đề tài (Chỉ nhóm trưởng)
     */
    public function registerGroup(Request $request, $topicId)
    {
        $currentUser = Auth::user();
        $topic = Detai::with('kehoachKhoaluan')->findOrFail($topicId);

        if (!$topic->kehoachKhoaluan->isFeatureActive('SV_DANGKY_DE')) {
            return response()->json(['message' => 'Chức năng đăng ký đề tài hiện chưa mở hoặc đã kết thúc.'], 403);
        }

        // Kiểm tra nếu người dùng là sinh viên
        if ($currentUser->vaitro->TEN_VAITRO !== 'Sinh viên') {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        $topic = Detai::findOrFail($topicId);

        // Tìm nhóm của người dùng mà họ là nhóm trưởng
        $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

        if (!$group) {
            return response()->json(['message' => 'Bạn không phải là nhóm trưởng'], 403);
        }

        // Kiểm tra nếu nhóm đã có đề tài
        $existingAssignment = PhancongDetaiNhom::where('ID_NHOM', $group->ID_NHOM)->first();
        if ($existingAssignment) {
            return response()->json(['message' => 'Nhóm đã có đề tài đã đăng ký'], 400);
        }

        DB::transaction(function () use ($topic, $group) {
            // Tạo phân công
            PhancongDetaiNhom::create([
                'ID_NHOM' => $group->ID_NHOM,
                'ID_DETAI' => $topic->ID_DETAI,
                'ID_GVHD' => $topic->ID_NGUOI_DEXUAT, // Tự động gán người đề xuất làm GVHD
            ]);

            // Cập nhật số lượng nhóm hiện tại của đề tài
            $topic->increment('SO_NHOM_HIENTAI');

            // Cập nhật tên nhóm theo tên đề tài
            $group->update([
                'TEN_NHOM' => $topic->TEN_DETAI,
                'TRANGTHAI' => 'Đã có đề tài'
            ]);
        });

        ActivityLogger::log(
            'REGISTER_TOPIC',
            "Đăng ký thành công đề tài: {$topic->TEN_DETAI}",
            ['topic_id' => $topic->ID_DETAI],
            $group->ID_NHOM
        );

        return response()->json(['message' => 'Nhóm đã đăng ký thành công']);
    }

    /**
     * Lấy các nhóm đã đăng ký đề tài của giảng viên
     */
    public function getRegisteredGroups(Request $request)
    {
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien; // Sử dụng quan hệ

        if (!$lecturer) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        $query = PhancongDetaiNhom::with([
            'nhom.thanhvienNhom.nguoidung',
            'nhom.nhomtruong',
            'detai.nguoiDexuat.nguoidung',
            'gvhd.nguoidung'
        ])->whereHas('detai', function ($q) use ($lecturer) {
            $q->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN);
        });

        // Lọc theo đề tài
        if ($request->has('topic_id')) {
            $query->where('ID_DETAI', $request->topic_id);
        }

        $assignments = $query->orderBy('NGAY_PHANCONG', 'desc')->paginate(10);

        return response()->json($assignments);
    }

    /**
     * Kiểm tra xem người dùng hiện tại có phải là nhóm trưởng hay không
     */
    public function isGroupLeader()
    {
        $currentUser = Auth::user();

        if (!$currentUser) {
            return response()->json(['error' => 'Chưa đăng nhập'], 401);
        }

        $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

        return response()->json([
            'user_id' => $currentUser->ID_NGUOIDUNG,
            'user_name' => $currentUser->HOTEN ?? null,
            'vai_tro' => $currentUser->vaitro->TEN_VAITRO ?? null,
            'group_found' => $group ? true : false,
            'group_info' => $group,
            'isGroupLeader' => !!$group,
        ]);
    }

    /**
     * Lấy trạng thái nhóm (đã đăng ký đề tài hay chưa)
     */
    public function groupStatus()
    {
        $currentUser = Auth::user();

        if ($currentUser->vaitro->TEN_VAITRO !== 'Sinh viên') {
            return response()->json(['hasRegisteredTopic' => false, 'topic' => null]);
        }

        // Đầu tiên tìm kiếm với vai trò nhóm trưởng
        $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

        // Nếu không phải nhóm trưởng, kiểm tra xem có phải là thành viên
        if (!$group) {
            $memberGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();
            if ($memberGroup) {
                $group = $memberGroup->nhom;
            }
        }

        if (!$group) {
            return response()->json(['hasRegisteredTopic' => false, 'topic' => null]);
        }

        $registered = PhancongDetaiNhom::where('ID_NHOM', $group->ID_NHOM)->first();

        return response()->json([
            'hasRegisteredTopic' => !!$registered,
            'topic' => $registered ? $registered->detai : null
        ]);
    }

    /**
     * Lấy đề tài đã đăng ký của nhóm người dùng hiện tại
     */
    public function getMyRegisteredTopic()
    {
        $currentUser = Auth::user();

        if ($currentUser->vaitro->TEN_VAITRO !== 'Sinh viên') {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        // Đầu tiên tìm kiếm với vai trò nhóm trưởng
        $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

        // Nếu không phải nhóm trưởng, kiểm tra xem có phải là thành viên
        if (!$group) {
            $memberGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();
            if ($memberGroup) {
                $group = $memberGroup->nhom;
            }
        }

        if (!$group) {
            return response()->json(['message' => 'Bạn không thuộc nhóm nào'], 403);
        }

        // Tìm phân công đề tài đã đăng ký
        $assignment = PhancongDetaiNhom::with(['detai.nguoiDexuat.nguoidung', 'detai.chuyennganh'])
            ->where('ID_NHOM', $group->ID_NHOM)
            ->first();

        if (!$assignment) {
            return response()->json(['message' => 'Không tìm thấy đề tài đã đăng ký'], 404);
        }

        return response()->json($assignment->detai);
    }

    /**
     * Lấy các đề tài mà giảng viên được phân công làm người hướng dẫn (GVHD)
     */
    public function getSupervisedTopics(Request $request)
    {
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien; // Sử dụng quan hệ

        if (!$lecturer) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        $query = Detai::with(['nguoiDexuat.nguoidung', 'chuyennganh', 'kehoachKhoaluan'])
            ->whereHas('phancongDetaiNhom', function ($q) use ($lecturer) {
                $q->where('ID_GVHD', $lecturer->ID_GIANGVIEN);
            });

        // Lọc theo trạng thái
        if ($request->has('status')) {
            $query->where('TRANGTHAI', $request->status);
        }

        // Lọc theo kế hoạch
        if ($request->has('plan_id')) {
            $query->where('ID_KEHOACH', $request->plan_id);
        }

        $topics = $query->orderBy('NGAYTAO', 'desc')->paginate(10);

        return response()->json($topics);
    }

    /**
     * Lấy các nhóm đã đăng ký đề tài của giảng viên
     */
    public function getGroupsForLecturer()
    {
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien; // Sử dụng quan hệ

        if (!$lecturer) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        // [FIX LỖI] Sử dụng ID_GVHD thay vì ID_NGUOI_DEXUAT
        // Và bỏ filter plan cũ để lấy tất cả các nhóm đang hoạt động
        $assignments = PhancongDetaiNhom::with([
            'nhom.thanhviens.nguoidung',
            'nhom.nhomtruong',
            'nhom.kehoach', // Load thêm kế hoạch để hiển thị tên đợt
            'detai.nguoiDexuat.nguoidung',
            'detai.chuyennganh',
            'gvhd.nguoidung'
        ])
        ->where('ID_GVHD', $lecturer->ID_GIANGVIEN) // <--- SỬA TẠI ĐÂY: Lọc theo người hướng dẫn
        ->orderBy('NGAY_PHANCONG', 'desc')
        ->get();

        return response()->json($assignments);
    }

    /**
     * Xóa đề tài khóa luận
     */
    public function destroy($id)
    {
        $topic = Detai::findOrFail($id);

        // Kiểm tra quyền
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien; // Sử dụng quan hệ

        $isProposer = $lecturer && $topic->ID_NGUOI_DEXUAT == $lecturer->ID_GIANGVIEN;
        // [CẬP NHẬT] Sử dụng helper isAdmin()
        $isAdmin = $this->isAdmin();

        if (!$isProposer && !$isAdmin) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        // Không thể xóa nếu đã duyệt hoặc có nhóm đăng ký
        if ($topic->TRANGTHAI === 'Đã duyệt' || $topic->SO_NHOM_HIENTAI > 0) {
            return response()->json(['message' => 'Không thể xóa đề tài đã duyệt hoặc đề tài đã có nhóm đăng ký'], 403);
        }

        $topic->delete();

        return response()->json(['message' => 'Đề tài đã xóa thành công']);
    }

    private function canImportTopics()
    {
        if ($this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu() || $this->isTruongBoMon()) {
            return true;
        }
        return false;
    }

    public function downloadImportTemplate()
    {
        if (!$this->canImportTopics()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        $path = storage_path('app/templates/import_topics_template.xlsx');
        
        if (!File::exists($path)) {
            return response()->json(['message' => 'File mẫu chưa được cấu hình trên server.'], 404);
        }
        
        return response()->download($path, 'mau_nhap_de_tai.xlsx');
    }

    public function previewImport(Request $request)
    {
        if (!$this->canImportTopics()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:10240',
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH'
        ]);

        try {
            $import = new \App\Imports\TopicsImport($request->ID_KEHOACH);
            
            Excel::import($import, $request->file('file'));

            $results = $import->getResults();

            return response()->json([
                'validRows' => $results['validRows'],
                'invalidRows' => $results['invalidRows'],
            ]);

        } catch (\Exception $e) {
            Log::error('Lỗi Import Đề tài: ' . $e->getMessage());
            return response()->json([
                'message' => 'Lỗi đọc file: ' . $e->getMessage(),
                'detail' => 'Vui lòng đảm bảo file có sheet tên "Khóa luận cử nhân" chứa cột "Tên đề tài" và "Email".'
            ], 500);
        }
    }

    // 3. Tiến hành Import (Process)
    public function processImport(Request $request)
    {
        if (!$this->canImportTopics()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        $request->validate([
            'data' => 'required|array',
        ]);

        $count = 0;
        DB::beginTransaction();
        try {
            foreach ($request->data as $row) {
                $topicCode = $row['MA_DETAI_GOC'] ?? ('DT' . date('Y') . strtoupper(substr(md5(uniqid()), 0, 6)));
                
                Detai::create([
                    'ID_KEHOACH' => $row['ID_KEHOACH'],
                    'MA_DETAI' => $topicCode,
                    'TEN_DETAI' => $row['TEN_DETAI'],
                    'MOTA' => $row['MOTA'],
                    'YEUCAU' => $row['YEUCAU'],
                    'MUCTIEU' => $row['MUCTIEU'] ?? '',
                    'KETQUA_MONGDOI' => $row['KETQUA_MONGDOI'] ?? '',
                    'ID_CHUYENNGANH' => $row['ID_CHUYENNGANH'],
                    'SO_NHOM_TOIDA' => $row['SO_NHOM_TOIDA'] ?? 1,
                    'ID_NGUOI_DEXUAT' => $row['ID_NGUOI_DEXUAT'],
                    'TRANGTHAI' => $row['TRANGTHAI'] ?? 'Nháp',
                    'NGAYTAO' => now()
                ]);
                $count++;
            }
            
            DB::commit();
            
            return response()->json(['message' => "Đã import thành công {$count} đề tài."]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi lưu dữ liệu: ' . $e->getMessage()], 500);
        }
    }
}