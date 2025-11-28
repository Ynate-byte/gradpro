<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LichSuHoatDong;
use App\Models\Nhom;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class HistoryController extends Controller
{
    /**
     * Lấy lịch sử hoạt động cá nhân.
     */
    public function getPersonalHistory(Request $request)
    {
        $user = $request->user(); 

        $query = LichSuHoatDong::where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)
            ->with('nhom:ID_NHOM,TEN_NHOM')
            ->orderBy('NGAY_TAO', 'desc');

        if ($request->filled('type')) {
            $query->where('LOAI_HANH_DONG', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('TIEU_DE', 'like', "%{$search}%");
        }

        $history = $query->paginate($request->per_page ?? 20);

        return response()->json($history);
    }

    /**
     * Lấy thống kê hoạt động cá nhân (Cho các thẻ Dashboard)
     */
    public function getPersonalStats(Request $request)
    {
        try {
            // Sử dụng Auth::id() để an toàn hơn, hoặc fallback nếu $request->user() null
            $userId = Auth::id() ?? $request->user()?->ID_NGUOIDUNG;

            if (!$userId) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }
            
            // Tổng số
            $total = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)->count();
            
            // Hôm nay
            $today = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)
                ->whereDate('NGAY_TAO', Carbon::today())
                ->count();

            // Tạo mới (Các hành động tạo, đăng ký, nộp, mời, gửi yêu cầu)
            $created = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)
                ->where(function($q) {
                    $q->where('LOAI_HANH_DONG', 'like', '%CREATE%')      
                      ->orWhere('LOAI_HANH_DONG', 'like', '%REGISTER%') 
                      ->orWhere('LOAI_HANH_DONG', 'like', '%SUBMIT%')    
                      ->orWhere('LOAI_HANH_DONG', 'like', '%INVITE%')    
                      ->orWhere('LOAI_HANH_DONG', 'like', '%REQUEST%')   
                      ->orWhere('LOAI_HANH_DONG', 'like', '%JOIN%');     
                })->count();

            // Cập nhật (Sửa, chuyển, đổi mật khẩu)
            $updated = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)
                ->where(function($q) {
                    $q->where('LOAI_HANH_DONG', 'like', '%UPDATE%')
                      ->orWhere('LOAI_HANH_DONG', 'like', '%MOVE%')       
                      ->orWhere('LOAI_HANH_DONG', 'like', '%CHANGE%')     
                      ->orWhere('LOAI_HANH_DONG', 'like', '%TRANSFER%'); 
                })->count();

            // Xác thực (Đăng nhập/xuất)
            $auth = LichSuHoatDong::where('ID_NGUOIDUNG', $userId)
                ->whereIn('LOAI_HANH_DONG', ['LOGIN', 'LOGOUT'])
                ->count();

            return response()->json([
                'total' => $total,
                'today' => $today,
                'created' => $created,
                'updated' => $updated,
                'auth' => $auth
            ]);
        } catch (\Exception $e) {
            Log::error("Error getting personal stats: " . $e->getMessage());
            return response()->json(['message' => 'Server Error'], 500);
        }
    }
    
    /**
     * Lấy lịch sử hoạt động của một nhóm.
     */
    public function getGroupHistory(Request $request, $groupId)
    {
        // Log để debug xem request có vào đây không
        Log::info("Fetching history for group ID: " . $groupId);

        $user = $request->user();
        
        // Thay findOrFail bằng find để kiểm soát lỗi 404 thủ công
        $nhom = Nhom::find($groupId);

        if (!$nhom) {
            return response()->json(['message' => 'Không tìm thấy nhóm.'], 404);
        }

        // Logic phân quyền (Giữ nguyên)
        $isManager = $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa();
        $isMember = $nhom->thanhviens()->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)->exists();
        
        // Fix lỗi check GVHD: Eager load hoặc query trực tiếp để tránh null pointer
        $isGvhd = false;
        if ($user->giangvien) {
            $isGvhd = \App\Models\PhancongDetaiNhom::where('ID_NHOM', $groupId)
                        ->where('ID_GVHD', $user->giangvien->ID_GIANGVIEN)
                        ->exists();
        }

        if (!$isManager && !$isMember && !$isGvhd) {
            return response()->json(['message' => 'Bạn không có quyền xem lịch sử của nhóm này.'], 403);
        }

        $query = LichSuHoatDong::where('ID_NHOM', $groupId)
            ->with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH') // Bỏ EMAIL cho nhẹ
            ->orderBy('NGAY_TAO', 'desc');

        // Filter & Search (Giữ nguyên)
        if ($request->filled('type')) {
            $query->where('LOAI_HANH_DONG', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('TIEU_DE', 'like', "%{$search}%")
                  ->orWhereHas('nguoidung', function($subQ) use ($search) {
                      $subQ->where('HODEM_VA_TEN', 'like', "%{$search}%");
                  });
            });
        }

        $history = $query->paginate($request->per_page ?? 20);

        return response()->json($history);
    }

    /**
     * (Admin) Lấy lịch sử hệ thống
     * Logic: Mặc định hiện log của Admin + Giảng viên. Ẩn log của Sinh viên.
     */
    public function getSystemHistory(Request $request)
    {
        // 1. Kiểm tra quyền truy cập API
        if (!$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = LichSuHoatDong::with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN,MA_DINHDANH,ID_VAITRO')
            ->orderBy('NGAY_TAO', 'desc');

        // --- LOGIC LỌC CHÍNH ---

        if ($request->filled('user_id')) {
            // CASE A: Đang tìm kiếm/lọc một người cụ thể
            // -> Hiển thị TẤT CẢ lịch sử của người đó (Kể cả Sinh viên)
            $query->where('ID_NGUOIDUNG', $request->user_id);

        } else {
            // CASE B: Màn hình chính (Mặc định)
            // -> Hiển thị: Admin, Giáo vụ, Trưởng khoa, Giảng viên.
            // -> Ẩn: Sinh viên.
            
            $query->whereHas('nguoidung', function($q) {
                $q->whereHas('vaitro', function($vq) {
                    // Chỉ lấy những người KHÔNG PHẢI là 'Sinh viên'
                    $vq->where('TEN_VAITRO', '!=', 'Sinh viên');
                });
            });

            // Vẫn ẩn Login/Logout để danh sách gọn gàng (trừ khi admin chọn lọc loại Login)
            if (!$request->filled('type') || $request->type === 'ALL') {
                $query->whereNotIn('LOAI_HANH_DONG', ['LOGIN', 'LOGOUT']);
            }
        }

        // --- CÁC BỘ LỌC PHỤ (Giữ nguyên) ---

        // Lọc theo Loại hành động
        if ($request->filled('type') && $request->type !== 'ALL') {
            $query->where('LOAI_HANH_DONG', 'like', "%{$request->type}%");
        }

        // Lọc theo từ khóa
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('TIEU_DE', 'like', "%{$search}%")
                  ->orWhereHas('nguoidung', function($subQ) use ($search) {
                      $subQ->where('HODEM_VA_TEN', 'like', "%{$search}%")
                           ->orWhere('MA_DINHDANH', 'like', "%{$search}%");
                  });
            });
        }

        // Lọc theo thời gian
        if ($request->filled('start_date') && $request->filled('end_date')) {
            try {
                $start = Carbon::parse($request->start_date)->startOfDay();
                $end = Carbon::parse($request->end_date)->endOfDay();
                $query->whereBetween('NGAY_TAO', [$start, $end]);
            } catch (\Exception $e) {}
        }

        $logs = $query->paginate($request->per_page ?? 20);

        return response()->json($logs);
    }

    public function cleanup(Request $request)
    {
        // Chỉ Admin cấp cao mới được dọn dẹp
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Chỉ Quản trị viên mới có quyền xóa dữ liệu hệ thống.'], 403);
        }

        $validated = $request->validate([
            'mode' => 'required|in:time,plan,auth',
            'value' => 'required' // Số tháng hoặc ID kế hoạch (nếu cần mở rộng)
        ]);

        $deletedCount = 0;
        $mode = $validated['mode'];
        $value = $validated['value'];

        DB::transaction(function () use ($mode, $value, &$deletedCount) {
            if ($mode === 'time') {
                // Xóa log cũ hơn X tháng
                $date = \Carbon\Carbon::now()->subMonths($value);
                $deletedCount = LichSuHoatDong::where('NGAY_TAO', '<', $date)->delete();
                
                $logMessage = "Đã dọn dẹp nhật ký cũ hơn {$value} tháng.";
            } 
            elseif ($mode === 'auth') {
                // Xóa log Login/Logout cũ hơn X tháng
                $date = \Carbon\Carbon::now()->subMonths($value);
                $deletedCount = LichSuHoatDong::whereIn('LOAI_HANH_DONG', ['LOGIN', 'LOGOUT'])
                    ->where('NGAY_TAO', '<', $date)
                    ->delete();

                $logMessage = "Đã dọn dẹp lịch sử truy cập cũ hơn {$value} tháng.";
            } 
            elseif ($mode === 'plan') {
                // Xóa log của các NHÓM thuộc các Kế hoạch đã "Đã hoàn thành"
                // Bước 1: Lấy ID các kế hoạch đã đóng
                $finishedPlanIds = \App\Models\KehoachKhoaluan::where('TRANGTHAI', 'Đã hoàn thành')->pluck('ID_KEHOACH');
                
                if ($finishedPlanIds->isEmpty()) {
                    $deletedCount = 0;
                } else {
                    // Bước 2: Lấy ID các nhóm thuộc kế hoạch đó
                    $groupIds = \App\Models\Nhom::whereIn('ID_KEHOACH', $finishedPlanIds)->pluck('ID_NHOM');
                    
                    // Bước 3: Xóa log thuộc các nhóm đó
                    if ($groupIds->isNotEmpty()) {
                        $deletedCount = LichSuHoatDong::whereIn('ID_NHOM', $groupIds)->delete();
                    }
                }

                $logMessage = "Đã dọn dẹp nhật ký của các Kế hoạch đã kết thúc.";
            }

            // Ghi log hành động dọn dẹp (Log này không bị xóa vì nó vừa được tạo mới nhất)
            if ($deletedCount > 0) {
                \App\Services\ActivityLogger::log(
                    'SYSTEM_CLEANUP',
                    $logMessage,
                    ['mode' => $mode, 'deleted_rows' => $deletedCount],
                    null,
                    'Eraser'
                );
            }
        });

        return response()->json([
            'message' => "Dọn dẹp thành công. Đã xóa {$deletedCount} bản ghi.",
            'deleted_count' => $deletedCount
        ]);
    }

    /**
     * Lấy dữ liệu so sánh thông minh.
     * [FIXED] Xử lý vấn đề thời gian không khớp khi chỉnh sửa nhanh ngay sau khi tạo
     */
    public function getComparisonData(Request $request, $topicId)
    {
        $topic = \App\Models\Detai::findOrFail($topicId);

        // 1. Tìm MỐC THỜI GIAN ADMIN YÊU CẦU SỬA (Hoặc Duyệt/Từ chối gần nhất)
        // Đây là điểm mốc quan trọng nhất. Chúng ta muốn xem GV đã sửa gì KỂ TỪ KHI Admin yêu cầu.
        $lastAdminAction = LichSuHoatDong::where(function($q) use ($topicId) {
                $q->whereJsonContains('CHI_TIET->topic_id', (int)$topicId)
                ->orWhereJsonContains('CHI_TIET->topic_id', (string)$topicId)
                ->orWhereJsonContains('CHI_TIET->model_id', (int)$topicId);
            })
            ->whereIn('LOAI_HANH_DONG', ['REJECT_TOPIC', 'REQUEST_EDIT', 'APPROVE_TOPIC'])
            ->orderBy('NGAY_TAO', 'desc')
            ->first();

        // 2. Xác định mốc thời gian cắt (Cutoff)
        if ($lastAdminAction) {
             // Nếu có Admin yêu cầu: Lấy mốc đó, trừ đi 5 phút để tránh lệch giây
             $cutoffDate = \Carbon\Carbon::parse($lastAdminAction->NGAY_TAO)->subMinutes(5);
        } else {
             // [FIX QUAN TRỌNG]: Nếu chưa có Admin tác động (tức là Đề tài mới tạo)
             // Lấy ngày tạo đề tài và TRỪ ĐI 24 GIỜ.
             // Điều này đảm bảo dù bạn vừa tạo xong và sửa ngay lập tức (cách nhau 1s),
             // hệ thống vẫn coi log sửa đó là "nằm sau" mốc thời gian này.
             $cutoffDate = \Carbon\Carbon::parse($topic->NGAYTAO)->subHours(24);
        }

        // 3. Lấy các log UPDATE xảy ra SAU mốc thời gian trên
        $updateLogs = LichSuHoatDong::where(function($q) use ($topicId) {
                $q->whereJsonContains('CHI_TIET->topic_id', (int)$topicId)
                ->orWhereJsonContains('CHI_TIET->topic_id', (string)$topicId)
                ->orWhereJsonContains('CHI_TIET->model_id', (int)$topicId);
            })
            ->where('LOAI_HANH_DONG', 'UPDATE_TOPIC')
            ->where('NGAY_TAO', '>=', $cutoffDate) 
            ->orderBy('NGAY_TAO', 'asc') // Lấy cũ nhất trước để tìm giá trị gốc ban đầu
            ->get();

        $consolidatedChanges = [];

        foreach ($updateLogs as $log) {
            // Decode JSON log
            $details = is_string($log->CHI_TIET) ? json_decode($log->CHI_TIET, true) : $log->CHI_TIET;
            
            if (isset($details['changes']) && is_array($details['changes'])) {
                foreach ($details['changes'] as $change) {
                    // Kiểm tra cấu trúc change
                    if (!isset($change['field'])) continue;
                    
                    $field = $change['field'];
                    
                    // [LOGIC]: Chỉ lấy giá trị 'old' của lần thay đổi ĐẦU TIÊN tìm thấy
                    // Đây chính là giá trị gốc tại thời điểm tạo hoặc lúc Admin yêu cầu sửa
                    if (!array_key_exists($field, $consolidatedChanges)) {
                        $consolidatedChanges[$field] = $change['old'] ?? null;
                    }
                }
            }
        }

        return response()->json($consolidatedChanges);
    }

    /**
     * Lấy lịch sử hoạt động của một đề tài cụ thể.
     * API: GET /api/history/topic/{topicId}
     */
    public function getTopicHistory(Request $request, $topicId)
    {
        $query = LichSuHoatDong::where(function($q) use ($topicId) {
                $q->whereJsonContains('CHI_TIET->topic_id', (int)$topicId)
                  ->orWhereJsonContains('CHI_TIET->topic_id', (string)$topicId) // [FIX] Hỗ trợ string
                  ->orWhereJsonContains('CHI_TIET->model_id', (int)$topicId);
            })
            ->with('nguoidung:ID_NGUOIDUNG,HODEM_VA_TEN')
            ->orderBy('NGAY_TAO', 'desc');

        $history = $query->paginate($request->input('per_page', 20));

        return response()->json($history);
    }
}