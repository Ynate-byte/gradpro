<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\GoiyDetai;
use App\Models\PhancongDetaiNhom;
use App\Models\Nhom;
use App\Models\Giangvien;
use App\Models\ThanhvienNhom;
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

        // Lấy thông tin người dùng hiện tại
        $currentUser = Auth::user();
        $isLecturer = $currentUser->giangvien ? true : false;
        $lecturerId = $currentUser->giangvien->ID_GIANGVIEN ?? null;

        if ($currentUser->vaitro->TEN_VAITRO === 'Sinh viên') {
            // Sinh viên: chỉ hiển thị các đề tài đã duyệt
            $query->where('TRANGTHAI', 'Đã duyệt');
        } else if ($isLecturer || $this->isAdmin() || $this->isGiaoVu() || $this->isTruongKhoa()) {
            // Giảng viên/Admin/Giáo vụ/Trưởng khoa: Mở rộng quyền xem
            
            // Lọc theo ID Kế hoạch (bắt buộc)
            if ($request->has('plan_id')) {
                $query->where('ID_KEHOACH', $request->plan_id);
            }

            // [SỬA LỖI LOGIC] Nếu là Giảng viên: Mở rộng kết quả để bao gồm:
            // 1. Đề tài đã duyệt (của mọi người)
            // 2. Đề tài của chính họ (bất kể trạng thái)
            // 3. Đề tài họ được phân công góp ý
            if ($lecturerId) {
                $query->where(function ($q) use ($lecturerId, $request) {
                    $q->where('TRANGTHAI', 'Đã duyệt') // 1. Tất cả đề tài đã duyệt
                      ->orWhere('ID_NGUOI_DEXUAT', $lecturerId) // 2. Đề tài của chính họ
                      ->orWhereHas('phancong_nguoi_gop_y', function ($subQ) use ($lecturerId) { // 3. Đề tài họ được phân công góp ý
                          $subQ->where('ID_GIANGVIEN', $lecturerId);
                      });
                    
                    // Nếu có bộ lọc trạng thái (status filter), áp dụng nó
                    if ($request->has('status') && $request->status !== 'Tất cả') {
                         $q->where('TRANGTHAI', $request->status);
                    }
                });
            } else {
                 // Admin/Quản trị viên cấp cao: chỉ cần lọc trạng thái nếu có
                if ($request->has('status') && $request->status !== 'Tất cả') {
                    $query->where('TRANGTHAI', $request->status);
                }
            }
        }
        
        // Lọc theo ID Giảng viên (chỉ áp dụng nếu có yêu cầu cụ thể, ví dụ trang hồ sơ GV)
        if ($request->has('lecturer_id') && $request->lecturer_id !== $lecturerId) {
            $query->where('ID_NGUOI_DEXUAT', $request->lecturer_id);
        }
        
        // Lọc theo chuyên ngành
        if ($request->has('major_id')) {
            $query->where('ID_CHUYENNGANH', $request->major_id);
        }

        // Tìm kiếm theo tên
        if ($request->has('search')) {
            $query->where('TEN_DETAI', 'like', '%' . $request->search . '%');
        }

        $topics = $query->orderBy('NGAYTAO', 'desc')->paginate(10);

        // Thêm tên giảng viên vào mỗi đề tài để hiển thị
        $topics->getCollection()->transform(function ($topic) {
            $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
            return $topic;
        });

        return response()->json($topics);
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

        $assignments = PhancongDetaiNhom::with([
            'nhom.thanhviens.nguoidung',
            'nhom.nhomtruong',
            'detai.nguoiDexuat.nguoidung',
            'detai.chuyennganh',
            'gvhd.nguoidung'
        ])->whereHas('detai', function ($q) use ($lecturer) {
            $q->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN);
        })->orderBy('NGAY_PHANCONG', 'desc')->get();

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

    public function downloadImportTemplate()
    {
        $path = storage_path('app/templates/import_topics_template.xlsx');
        
        // Tạo file mẫu nếu chưa có (Optional: Tốt nhất là bạn nên tạo sẵn file vật lý)
        if (!File::exists($path)) {
            return response()->json(['message' => 'File mẫu chưa được cấu hình trên server.'], 404);
        }
        
        return response()->download($path, 'mau_nhap_de_tai.xlsx');
    }

    // 2. Xem trước Import (Preview)
    public function previewImport(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:10240',
            'ID_KEHOACH' => 'required|exists:KEHOACH_KHOALUAN,ID_KEHOACH'
        ]);

        try {
            $import = new \App\Imports\TopicsImport($request->ID_KEHOACH);
            
            // Excel::import sẽ chạy qua các sheet được định nghĩa trong TopicsImport
            Excel::import($import, $request->file('file'));

            // [SỬA ĐỔI] Lấy kết quả từ hàm getResults() đã viết thêm hoặc truy cập trực tiếp sheetImport
            $results = $import->getResults();

            return response()->json([
                'validRows' => $results['validRows'],
                'invalidRows' => $results['invalidRows'],
            ]);

        } catch (\Exception $e) {
            // Ghi log lỗi hệ thống
            Log::error('Lỗi Import Đề tài: ' . $e->getMessage());
            // Log::error($e->getTraceAsString()); // Uncomment để debug sâu hơn

            // Trả về lỗi chi tiết cho Frontend
            return response()->json([
                'message' => 'Lỗi đọc file: ' . $e->getMessage(),
                'detail' => 'Vui lòng đảm bảo file có sheet tên "Khóa luận cử nhân" chứa cột "Tên đề tài" và "Email".'
            ], 500);
        }
    }

    // 3. Tiến hành Import (Process)
    public function processImport(Request $request)
    {
        $request->validate([
            'data' => 'required|array',
        ]);

        $count = 0;
        DB::beginTransaction();
        try {
            foreach ($request->data as $row) {
                // Tạo mã đề tài (nếu chưa có trong mảng row thì tạo mới)
                $topicCode = $row['MA_DETAI_GOC'] ?? ('DT' . date('Y') . strtoupper(substr(md5(uniqid()), 0, 6)));
                
                Detai::create([
                    'ID_KEHOACH' => $row['ID_KEHOACH'],
                    'MA_DETAI' => $topicCode,
                    'TEN_DETAI' => $row['TEN_DETAI'],
                    'MOTA' => $row['MOTA'], // Quan trọng: File Excel của bạn dùng cột Yêu cầu làm mô tả chính
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