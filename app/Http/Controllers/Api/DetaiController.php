<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Detai;
use App\Models\GoiyDetai;
use App\Models\PhancongDetaiNhom;
use App\Models\Nhom;
use App\Models\Giangvien;
use App\Models\ThanhvienNhom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DetaiController extends Controller
{
   /**
    * Display a listing of thesis topics
    */
   public function index(Request $request)
   {
       $query = Detai::with([
           'nguoiDexuat.nguoidung',
           'chuyennganh',
           'kehoachKhoaluan',
           'phancongDetaiNhom.nhom.thanhvienNhom.nguoidung',
           'phancongDetaiNhom.nhom.nhomtruong'
       ]);

       // Get current user
       $currentUser = Auth::user();

       // If user is student, only show approved topics
       if ($currentUser->vaitro->TEN_VAITRO === 'Sinh viên') {
           $query->where('TRANGTHAI', 'Đã duyệt');
       }

       // Filter by lecturer (for lecturer view)
       if ($request->has('lecturer_id')) {
           $query->where('ID_NGUOI_DEXUAT', $request->lecturer_id);
       }

       // Filter by status (only for non-student users)
       if ($request->has('status') && $currentUser->vaitro->TEN_VAITRO !== 'Sinh viên') {
           $query->where('TRANGTHAI', $request->status);
       }

       // Filter by plan
       if ($request->has('plan_id')) {
           $query->where('ID_KEHOACH', $request->plan_id);
       }

       // Filter by major
       if ($request->has('major_id')) {
           $query->where('ID_CHUYENNGANH', $request->major_id);
       }

       // Search by title
       if ($request->has('search')) {
           $query->where('TEN_DETAI', 'like', '%' . $request->search . '%');
       }

       $topics = $query->orderBy('NGAYTAO', 'desc')->paginate(10);

       // Add lecturer name to each topic for display
       $topics->getCollection()->transform(function ($topic) {
           $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';
           return $topic;
       });

       return response()->json($topics);
   }

   /**
    * Store a newly created thesis topic
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

       // Get current lecturer
       $currentUser = Auth::user();
       $lecturer = Giangvien::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();

       if (!$lecturer) {
           return response()->json(['message' => 'Unauthorized'], 403);
       }

       // Generate random topic code
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

       return response()->json($topic->load(['nguoiDexuat.nguoidung', 'chuyennganh']), 201);
   }

   /**
    * Display the specified thesis topic
    */
   public function show($id)
   {
       $topic = Detai::with([
           'nguoiDexuat.nguoidung',
           'chuyennganh',
           'kehoachKhoaluan',
           'goiyDetai' => function ($query) {
               $query->with(['nguoiGoiy.nguoidung'])
                     ->orderBy('NGAYTAO', 'desc');
           },
           'phancongDetaiNhom.nhom.nhomtruong',
           'phancongDetaiNhom.nhom.thanhvienNhom.nguoidung'
       ])->findOrFail($id);

       // Check if student can only view approved topics
       $currentUser = Auth::user();
       if ($currentUser->vaitro->TEN_VAITRO === 'Sinh viên' && $topic->TRANGTHAI !== 'Đã duyệt') {
           return response()->json(['message' => 'Unauthorized'], 403);
       }

       // Ensure goiyDetai is always an array
       $topic->goiyDetai = $topic->goiyDetai ?? [];

       // Add lecturer name for display
       $topic->ten_giang_vien = $topic->nguoiDexuat?->nguoidung?->HODEM_VA_TEN ?? 'N/A';

       return response()->json($topic);
   }

   /**
    * Update the specified thesis topic
    */
   public function update(Request $request, $id)
   {
       $topic = Detai::findOrFail($id);

       // Check if user is the proposer or admin
       $currentUser = Auth::user();
       $lecturer = Giangvien::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();

       $isProposer = $lecturer && $topic->ID_NGUOI_DEXUAT == $lecturer->ID_GIANGVIEN;
       $isAdmin = $currentUser->vaitro->TEN_VAITRO === 'Admin';

       if (!$isProposer && !$isAdmin) {
           return response()->json(['message' => 'Unauthorized'], 403);
       }

       // Cannot update if approved
       if ($topic->TRANGTHAI === 'Đã duyệt' && !$isAdmin) {
           return response()->json(['message' => 'Cannot update approved topic'], 403);
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

       // If updated by proposer, reset status to draft if it was rejected
       if ($isProposer && $topic->TRANGTHAI === 'Yêu cầu chỉnh sửa') {
           $topic->update(['TRANGTHAI' => 'Nháp']);
       }

       return response()->json($topic->load(['nguoiDexuat.nguoidung', 'chuyennganh']));
   }

   /**
    * Submit topic for approval
    */
   public function submitForApproval($id)
   {
       $topic = Detai::findOrFail($id);

       // Check if user is the proposer
       $currentUser = Auth::user();
       $lecturer = Giangvien::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();

    if (!$lecturer || $topic->ID_NGUOI_DEXUAT != $lecturer->ID_GIANGVIEN) {
    return response()->json(['message' => 'Unauthorized'], 403);
}

       if ($topic->TRANGTHAI !== 'Nháp') {
           return response()->json(['message' => 'Topic is not in draft status'], 400);
       }

       $topic->update(['TRANGTHAI' => 'Chờ duyệt']);

       return response()->json(['message' => 'Topic submitted for approval']);
   }

   /**
    * Approve or reject topic (Admin only)
    */
   public function approveOrReject(Request $request, $id)
   {
       $currentUser = Auth::user();
       if ($currentUser->vaitro->TEN_VAITRO !== 'Admin') {
           return response()->json(['message' => 'Unauthorized'], 403);
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

       return response()->json(['message' => 'Topic ' . ($request->action === 'approve' ? 'approved' : 'rejected')]);
   }

   /**
    * Add suggestion to topic
    */
   public function addSuggestion(Request $request, $id)
   {
       // Validate input
       $validator = Validator::make($request->all(), [
           'NOIDUNG_GOIY' => 'required|string|min:10|max:1000',
       ], [
           'NOIDUNG_GOIY.required' => 'Nội dung góp ý là bắt buộc',
           'NOIDUNG_GOIY.min' => 'Nội dung góp ý phải có ít nhất 10 ký tự',
           'NOIDUNG_GOIY.max' => 'Nội dung góp ý không được vượt quá 1000 ký tự',
       ]);

       if ($validator->fails()) {
           return response()->json(['errors' => $validator->errors()], 422);
       }

       // Find the topic
       $topic = Detai::findOrFail($id);

       // Get current authenticated user
       $currentUser = Auth::user();

       // Check if user is a lecturer
       $lecturer = Giangvien::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();
       if (!$lecturer) {
           return response()->json(['message' => 'Chỉ giảng viên mới có thể góp ý đề tài'], 403);
       }

       // Check if topic is in a suggestable state (draft or pending approval)
       if (!in_array($topic->TRANGTHAI, ['Nháp', 'Chờ duyệt'])) {
           return response()->json(['message' => 'Chỉ có thể góp ý cho đề tài ở trạng thái nháp hoặc chờ duyệt'], 403);
       }

       // Cannot suggest on own topic
       if ($lecturer && $topic->ID_NGUOI_DEXUAT == $lecturer->ID_GIANGVIEN) {
    return response()->json(['message' => 'Không thể góp ý cho đề tài của chính mình'], 403);
}

       // Check if lecturer already suggested on this topic
       $existingSuggestion = GoiyDetai::where('ID_DETAI', $id)
           ->where('ID_NGUOI_GOIY', $lecturer->ID_GIANGVIEN)
           ->first();

       if ($existingSuggestion) {
           return response()->json(['message' => 'Bạn đã góp ý cho đề tài này rồi'], 409);
       }

       // Create suggestion
       $suggestion = GoiyDetai::create([
           'ID_DETAI' => $id,
           'ID_NGUOI_GOIY' => $lecturer->ID_GIANGVIEN,
           'NOIDUNG_GOIY' => $request->NOIDUNG_GOIY,
           'NGAYTAO' => now(),
       ]);

       // Load relationships for response
       $suggestion->load(['nguoiGoiy.nguoidung']);

       return response()->json([
           'message' => 'Góp ý đã được gửi thành công',
           'suggestion' => $suggestion
       ], 201);
   }

   /**
    * Get available topics for students
    */
   public function getAvailableTopics(Request $request)
   {
       $query = Detai::with(['nguoiDexuat.nguoidung', 'chuyennganh'])
           ->where('TRANGTHAI', 'Đã duyệt');

       // Filter by plan
       if ($request->has('plan_id')) {
           $query->where('ID_KEHOACH', $request->plan_id);
       }

       // Filter by major if provided
       if ($request->has('major_id')) {
           $query->where('ID_CHUYENNGANH', $request->major_id);
       }

       // Search by title
       if ($request->has('search')) {
           $query->where('TEN_DETAI', 'like', '%' . $request->search . '%');
       }

       $topics = $query->orderBy('NGAYTAO', 'desc')->paginate(10);

       return response()->json($topics);
   }

   /**
    * Register group for topic (Group leader only)
    */
   public function registerGroup(Request $request, $topicId)
   {
       $currentUser = Auth::user();

       // Check if user is a student
       if ($currentUser->vaitro->TEN_VAITRO !== 'Sinh viên') {
           return response()->json(['message' => 'Unauthorized'], 403);
       }

       $topic = Detai::findOrFail($topicId);

       // Find user's group where they are the leader using Nhom table
       $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

       if (!$group) {
           return response()->json(['message' => 'You are not a group leader'], 403);
       }

       // Check if group already has a topic
       $existingAssignment = PhancongDetaiNhom::where('ID_NHOM', $group->ID_NHOM)->first();
       if ($existingAssignment) {
           return response()->json(['message' => 'Group already has a registered topic'], 400);
       }

       DB::transaction(function () use ($topic, $group) {
           // Create assignment
           PhancongDetaiNhom::create([
               'ID_NHOM' => $group->ID_NHOM,
               'ID_DETAI' => $topic->ID_DETAI,
               'ID_GVHD' => $topic->ID_NGUOI_DEXUAT, // Auto assign proposer as supervisor
           ]);

           // Update topic current groups count
           $topic->increment('SO_NHOM_HIENTAI');

           // Update group name to match the topic name
           $group->update([
               'TEN_NHOM' => $topic->TEN_DETAI,
               'TRANGTHAI' => 'Đã có đề tài'
           ]);
       });

       return response()->json(['message' => 'Group registered successfully']);
   }

   /**
    * Get registered groups for lecturer's topics
    */
   public function getRegisteredGroups(Request $request)
   {
       $currentUser = Auth::user();
       $lecturer = Giangvien::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();

       if (!$lecturer) {
           return response()->json(['message' => 'Unauthorized'], 403);
       }

       $query = PhancongDetaiNhom::with([
           'nhom.thanhvienNhom.nguoidung',
           'nhom.nhomtruong',
           'detai.nguoiDexuat.nguoidung',
           'gvhd.nguoidung'
       ])->whereHas('detai', function ($q) use ($lecturer) {
           $q->where('ID_NGUOI_DEXUAT', $lecturer->ID_GIANGVIEN);
       });

       // Filter by topic
       if ($request->has('topic_id')) {
           $query->where('ID_DETAI', $request->topic_id);
       }

       $assignments = $query->orderBy('NGAY_PHANCONG', 'desc')->paginate(10);

       return response()->json($assignments);
   }

   /**
    * Check if current user is a group leader
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
    * Get group status (has registered topic or not)
    */
   public function groupStatus()
   {
       $currentUser = Auth::user();

       if ($currentUser->vaitro->TEN_VAITRO !== 'Sinh viên') {
           return response()->json(['hasRegisteredTopic' => false, 'topic' => null]);
       }

       // First try to find as group leader
       $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

       // If not a leader, check if member of a group
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
    * Get the registered topic for the current user's group (works for both leader and members)
    */
   public function getMyRegisteredTopic()
   {
       $currentUser = Auth::user();

       if ($currentUser->vaitro->TEN_VAITRO !== 'Sinh viên') {
           return response()->json(['message' => 'Unauthorized'], 403);
       }

       // First try to find as group leader
       $group = Nhom::where('ID_NHOMTRUONG', $currentUser->ID_NGUOIDUNG)->first();

       // If not a leader, check if member of a group
       if (!$group) {
           $memberGroup = ThanhvienNhom::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();
           if ($memberGroup) {
               $group = $memberGroup->nhom;
           }
       }

       if (!$group) {
           return response()->json(['message' => 'You are not part of any group'], 403);
       }

       // Find the registered topic assignment
       $assignment = PhancongDetaiNhom::with(['detai.nguoiDexuat.nguoidung', 'detai.chuyennganh'])
           ->where('ID_NHOM', $group->ID_NHOM)
           ->first();

       if (!$assignment) {
           return response()->json(['message' => 'No registered topic found'], 404);
       }

       return response()->json($assignment->detai);
   }

   /**
    * Get topics where lecturer is assigned as supervisor (GVHD)
    */
   public function getSupervisedTopics(Request $request)
   {
       $currentUser = Auth::user();
       $lecturer = Giangvien::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();

       if (!$lecturer) {
           return response()->json(['message' => 'Unauthorized'], 403);
       }

       $query = Detai::with(['nguoiDexuat.nguoidung', 'chuyennganh', 'kehoachKhoaluan'])
           ->whereHas('phancongDetaiNhom', function ($q) use ($lecturer) {
               $q->where('ID_GVHD', $lecturer->ID_GIANGVIEN);
           });

       // Filter by status
       if ($request->has('status')) {
           $query->where('TRANGTHAI', $request->status);
       }

       // Filter by plan
       if ($request->has('plan_id')) {
           $query->where('ID_KEHOACH', $request->plan_id);
       }

       $topics = $query->orderBy('NGAYTAO', 'desc')->paginate(10);

       return response()->json($topics);
   }

   /**
    * Get groups that have registered for the lecturer's topics
    */
   public function getGroupsForLecturer()
   {
       $currentUser = Auth::user();
       $lecturer = Giangvien::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();

       if (!$lecturer) {
           return response()->json(['message' => 'Unauthorized'], 403);
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
    * Remove the specified thesis topic
    */
   public function destroy($id)
   {
       $topic = Detai::findOrFail($id);

       // Check permissions
       $currentUser = Auth::user();
       $lecturer = Giangvien::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();

      $isProposer = $lecturer && $topic->ID_NGUOI_DEXUAT == $lecturer->ID_GIANGVIEN;
       $isAdmin = $currentUser->vaitro->TEN_VAITRO === 'Admin';

       if (!$isProposer && !$isAdmin) {
           return response()->json(['message' => 'Unauthorized'], 403);
       }

       // Cannot delete if approved or has registered groups
       if ($topic->TRANGTHAI === 'Đã duyệt' || $topic->SO_NHOM_HIENTAI > 0) {
           return response()->json(['message' => 'Cannot delete approved topic or topic with registered groups'], 403);
       }

       $topic->delete();

       return response()->json(['message' => 'Topic deleted successfully']);
   }
}