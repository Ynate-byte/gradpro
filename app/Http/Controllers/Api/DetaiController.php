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
use App\Models\Nguoidung;
use App\Models\QuotaGiangvien;
use App\Models\KehoachKhoaluan;
use App\Imports\TopicsImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use App\Services\ActivityLogger;
use App\Services\NotificationService;

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
            'khoaBomon', // [SỬA] Load Bộ môn thay vì Chuyên ngành
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
            
            // [LƯU Ý] Sinh viên vẫn có thể lọc đề tài theo Bộ môn nếu muốn
            if ($request->has('department_id')) {
                $query->where('ID_KHOA_BOMON', $request->department_id);
            }
        } 
        // --- LOGIC CHO GIẢNG VIÊN / ADMIN / GIÁO VỤ ---
        else if ($isLecturer || $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa()) {
            
            // Lọc theo Kế hoạch (Bắt buộc để đúng ngữ cảnh)
            if ($request->has('plan_id')) {
                $query->where('ID_KEHOACH', $request->plan_id);
            }

            // [QUAN TRỌNG] Xử lý Filter Mode
            if ($lecturerId) {
                $filterMode = $request->input('filter_mode', 'all'); // Mặc định là 'all'

                if ($filterMode === 'review') {
                    // MODE: Cần góp ý (Review)
                    $query->whereHas('phancong_nguoi_gop_y', function ($subQ) use ($lecturerId) {
                        $subQ->where('ID_GIANGVIEN', $lecturerId);
                    });
                } 
                elseif ($filterMode === 'my') {
                    // MODE: Đề tài của tôi
                    $query->where('ID_NGUOI_DEXUAT', $lecturerId);
                } 
                else {
                    // MODE: Tất cả (All) - Logic phức hợp
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
                // Nếu là Admin thuần, mặc định ẩn Nháp của người khác
                $query->where('TRANGTHAI', '<>', 'Nháp');
            }

            // Lọc theo Trạng thái
            if ($request->has('status') && $request->status !== 'Tất cả') {
                if (is_array($request->status)) {
                    $query->whereIn('TRANGTHAI', $request->status);
                } else {
                    $query->where('TRANGTHAI', $request->status);
                }
            }

            // Lọc theo ID Giảng viên cụ thể
            if ($request->has('lecturer_id') && $request->lecturer_id !== $lecturerId) {
                $query->where('ID_NGUOI_DEXUAT', $request->lecturer_id);
            }

            // [SỬA] Lọc theo Bộ môn (Thay vì Chuyên ngành)
            if ($request->has('department_id')) {
                $query->where('ID_KHOA_BOMON', $request->department_id);
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
            $topic->ten_bo_mon = $topic->khoaBomon?->TEN_KHOA_BOMON ?? 'N/A'; // [SỬA] Return tên bộ môn
            return $topic;
        });

        return response()->json($topics);
    }

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

        $query = Detai::with(['kehoachKhoaluan', 'khoaBomon']) // [SỬA] Load khoaBomon
            ->where('TRANGTHAI', 'Đã duyệt')
            ->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN)
            ->select('DETAI.*') 
            ->groupBy('DETAI.ID_DETAI'); 

        $topics = $query->orderBy('TEN_DETAI', 'asc')->get();

        return response()->json($topics);
    }

    /**
     * Tái sử dụng đề tài đã duyệt cho một kế hoạch khác
     */
    public function reuseApprovedTopic(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'existing_topic_id' => 'required|integer|exists:DETAI,ID_DETAI',
            'new_plan_id' => 'required|integer|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;
        if (!$lecturer) return response()->json(['message' => 'Không được phép'], 403);

        $existingTopic = Detai::findOrFail($request->existing_topic_id);
        
        // Check quyền sở hữu
        if ($existingTopic->TRANGTHAI !== 'Đã duyệt' || $existingTopic->ID_NGUOI_DEXUAT != $lecturer->ID_GIANGVIEN) {
            return response()->json(['message' => 'Chỉ có thể tái sử dụng đề tài đã duyệt của chính bạn'], 403);
        }

        // 1. Lấy thông tin Kế hoạch & Quota của Giảng viên
        $plan = KehoachKhoaluan::findOrFail($request->new_plan_id);
        $quota = QuotaGiangvien::where('ID_KEHOACH', $plan->ID_KEHOACH)
            ->where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
            ->first();

        if (!$quota || $quota->SO_DETAI_QUOTA <= 0) {
            return response()->json(['message' => 'Bạn chưa được phân công chỉ tiêu (Quota) cho kế hoạch này.'], 400);
        }

        // 2. Tính toán giới hạn tái sử dụng
        $reusePercentage = $plan->TYLE_TAISUDUNG_TOIDA ?? 0;
        $maxReuseAllowed = floor(($quota->SO_DETAI_QUOTA * $reusePercentage) / 100);

        // 3. Đếm số đề tài ĐÃ tái sử dụng trong kế hoạch này
        $currentReusedCount = Detai::where('ID_KEHOACH', $plan->ID_KEHOACH)
            ->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN)
            ->where('LA_TAISUDUNG', true)
            ->count();

        if ($currentReusedCount >= $maxReuseAllowed) {
            return response()->json([
                'message' => "Bạn đã đạt giới hạn tái sử dụng ({$currentReusedCount}/{$maxReuseAllowed} đề tài). Vui lòng tạo đề tài mới."
            ], 400);
        }

        // 4. Tạo đề tài mới (Duyệt ngay lập tức)
        $newTopic = Detai::create([
            'ID_KEHOACH' => $request->new_plan_id,
            'MA_DETAI' => 'DT' . date('Y') . strtoupper(substr(md5(uniqid()), 0, 6)),
            'TEN_DETAI' => $existingTopic->TEN_DETAI,
            'MOTA' => $existingTopic->MOTA,
            'ID_KHOA_BOMON' => $existingTopic->ID_KHOA_BOMON,
            'YEUCAU' => $existingTopic->YEUCAU,
            'MUCTIEU' => $existingTopic->MUCTIEU,
            'KETQUA_MONGDOI' => $existingTopic->KETQUA_MONGDOI,
            'ID_NGUOI_DEXUAT' => $lecturer->ID_GIANGVIEN,
            'SO_NHOM_TOIDA' => $existingTopic->SO_NHOM_TOIDA,
            'TRANGTHAI' => 'Đã duyệt',
            'LA_TAISUDUNG' => true, 
            'NGAY_DUYET' => now(),
            'ID_NGUOI_DUYET' => $currentUser->ID_NGUOIDUNG,
        ]);

        ActivityLogger::log('REUSE_TOPIC', "Tái sử dụng đề tài: {$existingTopic->TEN_DETAI}", ['new_id' => $newTopic->ID_DETAI], null, 'Copy');

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
            
            'ID_KHOA_BOMON' => 'required|exists:KHOA_BOMON,ID_KHOA_BOMON',
            
            'YEUCAU' => 'nullable|string',
            'MUCTIEU' => 'nullable|string',
            'KETQUA_MONGDOI' => 'nullable|string',
            'SO_NHOM_TOIDA' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;

        if (!$lecturer) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        $topicCode = 'DT' . date('Y') . strtoupper(substr(md5(uniqid()), 0, 6));

        DB::beginTransaction();
        try {
            $topic = Detai::create([
                'ID_KEHOACH' => $request->ID_KEHOACH,
                'MA_DETAI' => $topicCode,
                'TEN_DETAI' => $request->TEN_DETAI,
                'MOTA' => $request->MOTA,
                
                'ID_KHOA_BOMON' => $request->ID_KHOA_BOMON,
                
                'YEUCAU' => $request->YEUCAU,
                'MUCTIEU' => $request->MUCTIEU,
                'KETQUA_MONGDOI' => $request->KETQUA_MONGDOI,
                'ID_NGUOI_DEXUAT' => $lecturer->ID_GIANGVIEN,
                'SO_NHOM_TOIDA' => $request->SO_NHOM_TOIDA ?? 1,
                'TRANGTHAI' => 'Nháp',
            ]);

            $quotaGV = \App\Models\QuotaGiangvien::where('ID_KEHOACH', $request->ID_KEHOACH)
                ->where('ID_GIANGVIEN', $lecturer->ID_GIANGVIEN)
                ->first();

            if ($quotaGV && $quotaGV->TRANGTHAI === 'Đang phân công') {
                $createdCount = Detai::where('ID_KEHOACH', $request->ID_KEHOACH)
                    ->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN)
                    ->count();

                // Nếu số đề tài đã tạo >= Quota được giao -> Chuyển sang Hoàn thành
                if ($createdCount >= $quotaGV->SO_DETAI_QUOTA) {
                    $quotaGV->update(['TRANGTHAI' => 'Hoàn thành']);
                    
                    if ($currentUser) {
                         NotificationService::send(
                            $currentUser->ID_NGUOIDUNG,
                            "Hoàn thành chỉ tiêu đề tài",
                            "Bạn đã đề xuất đủ số lượng đề tài theo chỉ tiêu được giao ({$createdCount}/{$quotaGV->SO_DETAI_QUOTA}).",
                            'ACADEMIC',
                            '/lecturer/thesis-topics'
                        );
                    }
                }
            }

            ActivityLogger::log(
                'PROPOSE_TOPIC',
                "Đề xuất đề tài mới: {$topic->TEN_DETAI}",
                ['topic_code' => $topicCode],
                null,
                'FileText'
            );

            DB::commit();
            return response()->json($topic->load(['nguoiDexuat.nguoidung', 'khoaBomon']), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi tạo đề tài: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi tạo đề tài: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Hiển thị chi tiết đề tài khóa luận
     */
    public function show($id)
    {
        $topic = Detai::with([
            'nguoiDexuat.nguoidung',
            'khoaBomon', // [SỬA]
            'kehoachKhoaluan',
            'goiyDetai' => function ($query) {
                $query->with([
                        'giangvien.nguoidung', 
                        'phanhois.giangvien.nguoidung'
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

        $topic->goiyDetai = $topic->goiyDetai ?? [];
        $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
        $topic->ten_bo_mon = $topic->khoaBomon?->TEN_KHOA_BOMON ?? 'N/A'; // [SỬA] Return tên bộ môn

        return response()->json($topic);
    }

    /**
     * Cập nhật đề tài khóa luận
     */
    public function update(Request $request, $id)
    {
        $topic = Detai::findOrFail($id);
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;

        // Người đề xuất được sửa, Admin/Trưởng khoa được sửa
        $isProposer = $lecturer && $topic->ID_NGUOI_DEXUAT == $lecturer->ID_GIANGVIEN;
        $isAdmin = $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();

        if (!$isProposer && !$isAdmin) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        // Nếu đã duyệt, chỉ Admin mới được sửa trực tiếp mà không đổi trạng thái (trừ trường hợp Tái sử dụng bên dưới)
        if ($topic->TRANGTHAI === 'Đã duyệt' && !$isAdmin && !$topic->LA_TAISUDUNG) {
            return response()->json(['message' => 'Không thể cập nhật đề tài đã duyệt'], 403);
        }

        // 2. Validate dữ liệu
        $validator = Validator::make($request->all(), [
            'TEN_DETAI' => 'sometimes|required|string|max:255',
            'MOTA' => 'sometimes|required|string',
            'ID_KHOA_BOMON' => 'nullable|exists:KHOA_BOMON,ID_KHOA_BOMON',
            'YEUCAU' => 'nullable|string',
            'MUCTIEU' => 'nullable|string',
            'KETQUA_MONGDOI' => 'nullable|string',
            'SO_NHOM_TOIDA' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // 3. Lấy dữ liệu gốc để log
        $originalData = $topic->getOriginal();

        // 4. Fill dữ liệu mới
        $topic->fill($request->only([
            'TEN_DETAI', 'MOTA', 'ID_KHOA_BOMON', 'YEUCAU', 'MUCTIEU', 'KETQUA_MONGDOI', 'SO_NHOM_TOIDA'
        ]));

        // 5. Xử lý Logic Thay đổi
        if ($topic->isDirty()) {
            $dirtyFields = $topic->getDirty();
            $details = [];

            foreach ($dirtyFields as $key => $newValue) {
                if (in_array($key, ['updated_at', 'NGAYCAPNHAT'])) continue;
                $details[] = [
                    'field' => $key,
                    'old' => $originalData[$key] ?? '',
                    'new' => $newValue
                ];
            }

            // Nếu đề tài là Tái sử dụng VÀ Đang ở trạng thái 'Đã duyệt' VÀ Người sửa KHÔNG PHẢI Admin
            // => Bắt buộc chuyển về 'Chờ duyệt' để duyệt lại
            if ($topic->LA_TAISUDUNG && $topic->TRANGTHAI === 'Đã duyệt' && !$isAdmin) {
                $topic->TRANGTHAI = 'Chờ duyệt';
            }

            $topic->save();

            // Ghi log
            if (!empty($details)) {
                ActivityLogger::log(
                    'UPDATE_TOPIC',
                    "Cập nhật đề tài: {$topic->TEN_DETAI}",
                    [
                        'changes' => $details,
                        'topic_id' => (int)$topic->ID_DETAI,
                        'status_changed_to' => $topic->TRANGTHAI
                    ],
                    null,
                    'Edit'
                );
            }
        }

        // 6. Xử lý chuyển trạng thái thông thường (cho đề tài không phải tái sử dụng hoặc đang nháp)
        if ($isProposer && in_array($topic->TRANGTHAI, ['Yêu cầu chỉnh sửa', 'Chờ duyệt', 'Đang chỉnh sửa'])) {
            $newState = ($topic->TRANGTHAI === 'Yêu cầu chỉnh sửa') ? 'Nháp' : 
                       (($topic->TRANGTHAI === 'Chờ duyệt') ? 'Đang chỉnh sửa' : 'Chờ duyệt');
            
            if ($topic->TRANGTHAI !== $newState) {
                $topic->update(['TRANGTHAI' => $newState]);
            }
        }

        return response()->json($topic->load(['nguoiDexuat.nguoidung', 'khoaBomon']));
    }

    /**
     * Gửi đề tài để phê duyệt
     */
    public function submitForApproval($id)
    {
        $topic = Detai::with('nguoiDexuat.nguoidung')->findOrFail($id);

        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;

        $isProposer = $lecturer && $topic->ID_NGUOI_DEXUAT == $lecturer->ID_GIANGVIEN;
        $isAdmin = $this->isAdmin();

        if (!$isProposer && !$isAdmin) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        if (!in_array($topic->TRANGTHAI, ['Nháp', 'Đang chỉnh sửa'])) {
            return response()->json(['message' => 'Đề tài phải ở trạng thái nháp hoặc đang chỉnh sửa để gửi duyệt. Hãy sửa đề tài để chuyển trạng thái!'], 400);
        }
        
        if ($topic->kehoachKhoaluan && !$topic->kehoachKhoaluan->isFeatureActive('GV_RA_DE')) {
             return response()->json(['message' => 'Chức năng gửi duyệt đề tài hiện đang đóng.'], 403);
        }

        $topic->update(['TRANGTHAI' => 'Chờ duyệt']);

        try {
            // Tìm người duyệt (Admin/Trưởng khoa/Giáo vụ)
            $approvers = Nguoidung::where('TRANGTHAI_KICHHOAT', true)
                ->where(function($query) {
                    $query->whereHas('vaitro', function($q) {
                        $q->whereIn('TEN_VAITRO', ['Admin', 'Trưởng khoa', 'Giáo vụ']);
                    })
                    ->orWhereHas('giangvien.chucvus', function($q) {
                        $q->whereIn('MA_CHUCVU', ['TRUONG_KHOA', 'GIAO_VU']);
                    });
                })
                ->get();

            $senderName = $currentUser->HODEM_VA_TEN ?? 'Giảng viên';

            foreach ($approvers as $approver) {
                if ($approver->ID_NGUOIDUNG === $currentUser->ID_NGUOIDUNG) continue;

                NotificationService::send(
                    $approver->ID_NGUOIDUNG,
                    "Yêu cầu duyệt đề tài",
                    "{$senderName} vừa gửi yêu cầu duyệt đề tài: '{$topic->TEN_DETAI}'.",
                    'ACADEMIC',
                    '/admin/thesis-topics?status=Chờ duyệt',
                    ['topic_id' => $topic->ID_DETAI]
                );
            }

            ActivityLogger::log(
                'SUBMIT_TOPIC',
                "Gửi duyệt đề tài: {$topic->TEN_DETAI}",
                ['topic_id' => $topic->ID_DETAI],
                null,
                'Send'
            );

        } catch (\Exception $e) {
            Log::error("Lỗi gửi thông báo submitForApproval: " . $e->getMessage());
        }

        return response()->json(['message' => 'Đã gửi đề tài để phê duyệt.']);
    }

    /**
     * Duyệt hoặc từ chối đề tài (Chỉ Admin)
     */
    public function approveOrReject(Request $request, $id)
    {
        $currentUser = Auth::user();
        
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Không được phép'], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'action' => 'required|in:approve,reject,request_edit', // [SỬA] Thêm request_edit cho rõ ràng
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

            ActivityLogger::log(
                'APPROVE_TOPIC',
                "Đã duyệt đề tài: {$topic->TEN_DETAI}",
                ['topic_id' => $topic->ID_DETAI],
                null,
                'CheckCircle'
            );
        } 
        else {
            
            $isReject = $request->action === 'reject';
            $status = $isReject ? 'Từ chối' : 'Yêu cầu chỉnh sửa';
            $logAction = $isReject ? 'REJECT_TOPIC' : 'REQUEST_EDIT';
            $logMessage = $isReject ? "Từ chối đề tài: {$topic->TEN_DETAI}" : "Yêu cầu chỉnh sửa đề tài: {$topic->TEN_DETAI}";
            $icon = $isReject ? 'XCircle' : 'Edit';

            $topic->update([
                'TRANGTHAI' => $status,
                'LYDO_TUCHOI' => $request->reason,
            ]);

            ActivityLogger::log(
                $logAction,
                $logMessage,
                [
                    'topic_id' => $topic->ID_DETAI,
                    'reason' => $request->reason
                ],
                null,
                $icon
            );
        }

        return response()->json(['message' => 'Thao tác thành công']);
    }

    /**
     * Thêm góp ý cho đề tài
     */
    public function addSuggestion(Request $request, $id)
    {
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

        $topic = Detai::findOrFail($id);
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;
        
        if (!$lecturer) {
            return response()->json(['message' => 'Chỉ giảng viên mới có thể góp ý đề tài'], 403);
        }

        if (!in_array($topic->TRANGTHAI, ['Nháp', 'Chờ duyệt', 'Đang chỉnh sửa', 'Yêu cầu chỉnh sửa'])) {
            return response()->json(['message' => 'Không thể góp ý cho đề tài đã được duyệt hoặc đã khóa.'], 403);
        }

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

        if ($assignment && $assignment->TRANGTHAI !== 'Hoàn thành') {
            $assignment->update(['TRANGTHAI' => 'Hoàn thành']);
        }

        if ($topic->TRANGTHAI === 'Chờ duyệt' && $request->boolean('is_edit_request')) {
            $topic->update(['TRANGTHAI' => 'Đang chỉnh sửa']);
        }

        ActivityLogger::log(
            'ADD_SUGGESTION',
            "Góp ý cho đề tài: {$topic->TEN_DETAI}",
            ['content_preview' => substr($request->NOIDUNG_GOIY, 0, 50) . '...'],
            null,
            'MessageSquare'
        );

        $suggestion->load(['giangvien.nguoidung']);

        return response()->json([
            'message' => 'Góp ý đã được gửi thành công',
            'suggestion' => $suggestion
        ], 201);
    }

    /**
     * Lấy các đề tài có sẵn cho sinh viên đăng ký
     */
    /**
     * Lấy các đề tài có sẵn cho sinh viên đăng ký (Đã tối ưu Performance & Pagination)
     */
    public function getAvailableTopics(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH'
        ]);

        $query = Detai::select([
                'ID_DETAI', 
                'MA_DETAI', 
                'TEN_DETAI', 
                'MOTA', 
                'ID_NGUOI_DEXUAT', 
                'ID_KHOA_BOMON', 
                'SO_NHOM_TOIDA', 
                'SO_NHOM_HIENTAI',
                'TRANGTHAI',
                'NGAYTAO'
            ])
            ->where('TRANGTHAI', 'Đã duyệt')
            ->where('ID_KEHOACH', $request->plan_id)
            ->whereColumn('SO_NHOM_HIENTAI', '<', 'SO_NHOM_TOIDA');

        $query->with([
            'nguoiDexuat.nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN', 
            'khoaBomon:ID_KHOA_BOMON,TEN_KHOA_BOMON'
        ]);
        
        if ($request->filled('lecturer_id') && $request->lecturer_id !== 'all') {
            $query->where('ID_NGUOI_DEXUAT', $request->lecturer_id);
        }

        if ($request->filled('department_id') && $request->department_id !== 'all') {
            $query->where('ID_KHOA_BOMON', $request->department_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('TEN_DETAI', 'like', '%' . $search . '%')
                  ->orWhere('MA_DETAI', 'like', '%' . $search . '%');
            });
        }

        $query->orderBy('NGAYTAO', 'desc');

        $topics = $query->paginate($request->input('per_page', 20));

        $topics->getCollection()->transform(function ($topic) {
            return [
                'ID_DETAI' => $topic->ID_DETAI,
                'MA_DETAI' => $topic->MA_DETAI,
                'TEN_DETAI' => $topic->TEN_DETAI,
                'MOTA' => $topic->MOTA, 
                'slots_remaining' => $topic->SO_NHOM_TOIDA - $topic->SO_NHOM_HIENTAI,
                'current_slots' => $topic->SO_NHOM_HIENTAI,
                'total_slots' => $topic->SO_NHOM_TOIDA,
                'lecturer_name' => $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A',
                'department_name' => $topic->khoaBomon?->TEN_KHOA_BOMON ?? 'N/A',
                'nguoi_dexuat' => $topic->nguoiDexuat,
                'khoa_bomon' => $topic->khoaBomon
            ];
        });

        return response()->json($topics);
    }

    /**
     * Lấy danh sách Giảng viên có đề tài trong kế hoạch (để làm bộ lọc)
     */
    public function getSupervisorsByPlan(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH'
        ]);

        $lecturers = Giangvien::whereHas('detai', function($q) use ($request) {
            $q->where('ID_KEHOACH', $request->plan_id)
              ->where('TRANGTHAI', 'Đã duyệt');
        })
        ->with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN')
        ->get()
        ->map(function($gv) {
            $name = $gv->nguoidung ? $gv->nguoidung->HODEM_VA_TEN : ('GV #' . $gv->ID_GIANGVIEN);
            return [
                'ID_GIANGVIEN' => $gv->ID_GIANGVIEN,
                'HODEM_VA_TEN' => $name
            ];
        });

        return response()->json($lecturers);
    }

    /**
     * Đăng ký nhóm cho đề tài (Chỉ nhóm trưởng)
     */
    public function registerGroup(Request $request, $topicId)
    {
        $currentUser = Auth::user();
        
        if ($currentUser->vaitro->TEN_VAITRO !== 'Sinh viên') {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        $topic = Detai::with(['kehoachKhoaluan', 'nguoiDexuat'])->findOrFail($topicId);

        if (!$topic->kehoachKhoaluan->isFeatureActive('SV_DANGKY_DE')) {
            return response()->json(['message' => 'Chức năng đăng ký đề tài hiện chưa mở hoặc đã kết thúc.'], 403);
        }

        $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

        if (!$group) {
            return response()->json(['message' => 'Bạn không phải là nhóm trưởng'], 403);
        }

        if ($topic->ID_KEHOACH != $group->ID_KEHOACH) {
            return response()->json([
                'message' => 'Đề tài này thuộc khóa/đợt khác. Bạn không thể đăng ký.'
            ], 400);
        }

        $existingAssignment = PhancongDetaiNhom::where('ID_NHOM', $group->ID_NHOM)->first();
        if ($existingAssignment) {
            return response()->json(['message' => 'Nhóm đã có đề tài đã đăng ký'], 400);
        }

        if ($topic->SO_NHOM_HIENTAI >= $topic->SO_NHOM_TOIDA) {
            return response()->json(['message' => 'Đề tài này đã đủ số lượng nhóm đăng ký.'], 400);
        }

        DB::transaction(function () use ($topic, $group) {
            $topicLocked = Detai::where('ID_DETAI', $topic->ID_DETAI)->lockForUpdate()->first();

            if ($topicLocked->SO_NHOM_HIENTAI >= $topicLocked->SO_NHOM_TOIDA) {
                throw new \Exception('Đề tài vừa bị nhóm khác đăng ký đầy.');
            }

            PhancongDetaiNhom::create([
                'ID_NHOM' => $group->ID_NHOM,
                'ID_DETAI' => $topic->ID_DETAI,
                'ID_GVHD' => $topic->ID_NGUOI_DEXUAT,
                'NGAY_PHANCONG' => now(),
                'TRANGTHAI' => 'Đang thực hiện'
            ]);

            $topicLocked->increment('SO_NHOM_HIENTAI');

            $group->update([
                'TEN_NHOM' => $topicLocked->TEN_DETAI,
                'TRANGTHAI' => 'Đã có đề tài'
            ]);

            $lecturerId = $topic->nguoiDexuat->ID_NGUOIDUNG ?? null;
            if ($lecturerId) {
                NotificationService::send(
                    $lecturerId,
                    "Đề tài đã được đăng ký",
                    "Nhóm '{$group->TEN_NHOM}' (Mã nhóm: {$group->ID_NHOM}) vừa đăng ký đề tài của bạn: {$topic->TEN_DETAI}.",
                    'ACADEMIC',
                    '/lecturer/groups-management',
                    ['topic_id' => $topic->ID_DETAI, 'group_id' => $group->ID_NHOM],
                    'HIGH'
                );
            }
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
        $lecturer = $currentUser->giangvien;

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

        $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

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

        $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

        if (!$group) {
            $memberGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();
            if ($memberGroup) {
                $group = $memberGroup->nhom;
            }
        }

        if (!$group) {
            return response()->json(['message' => 'Bạn không thuộc nhóm nào'], 403);
        }

        $assignment = PhancongDetaiNhom::with(['detai.nguoiDexuat.nguoidung', 'detai.khoaBomon']) // [SỬA] Load khoaBomon
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
        $lecturer = $currentUser->giangvien;

        if (!$lecturer) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        $query = Detai::with(['nguoiDexuat.nguoidung', 'khoaBomon', 'kehoachKhoaluan']) // [SỬA]
            ->whereHas('phancongDetaiNhom', function ($q) use ($lecturer) {
                $q->where('ID_GVHD', $lecturer->ID_GIANGVIEN);
            });

        if ($request->has('status')) {
            $query->where('TRANGTHAI', $request->status);
        }

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
        $lecturer = $currentUser->giangvien;

        if (!$lecturer) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        $assignments = PhancongDetaiNhom::with([
            'nhom.thanhviens.nguoidung',
            'nhom.nhomtruong',
            'nhom.kehoach',
            'detai.nguoiDexuat.nguoidung',
            'detai.khoaBomon', // [SỬA] Load khoaBomon
            'gvhd.nguoidung'
        ])
        ->where('ID_GVHD', $lecturer->ID_GIANGVIEN)
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
        $currentUser = Auth::user();
        $lecturer = $currentUser->giangvien;

        $isProposer = $lecturer && $topic->ID_NGUOI_DEXUAT == $lecturer->ID_GIANGVIEN;
        $isAdmin = $this->isAdmin();

        if (!$isProposer && !$isAdmin) {
            return response()->json(['message' => 'Không được phép'], 403);
        }

        if ($topic->TRANGTHAI === 'Đã duyệt' || $topic->SO_NHOM_HIENTAI > 0) {
            return response()->json(['message' => 'Không thể xóa đề tài đã duyệt hoặc đề tài đã có nhóm đăng ký'], 403);
        }

        DB::beginTransaction();
        try {
            $planId = $topic->ID_KEHOACH;
            $lecturerId = $topic->ID_NGUOI_DEXUAT;

            $topic->delete();
            
            $quotaGV = \App\Models\QuotaGiangvien::where('ID_KEHOACH', $planId)
                ->where('ID_GIANGVIEN', $lecturerId)
                ->first();

            if ($quotaGV && $quotaGV->TRANGTHAI === 'Hoàn thành') {
                $currentCount = Detai::where('ID_KEHOACH', $planId)
                    ->where('ID_NGUOI_DEXUAT', $lecturerId)
                    ->count();
                
                if ($currentCount < $quotaGV->SO_DETAI_QUOTA) {
                    $quotaGV->update(['TRANGTHAI' => 'Đang phân công']);
                }
            }

            DB::commit();
            return response()->json(['message' => 'Đề tài đã xóa thành công']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi xóa đề tài'], 500);
        }
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
            $import = new TopicsImport($request->ID_KEHOACH);
            
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
                    'ID_KHOA_BOMON' => $row['ID_KHOA_BOMON'] ?? null,                     
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