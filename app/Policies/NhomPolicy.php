<?php

namespace App\Policies;

use App\Models\Nguoidung;
use App\Models\Nhom;
use Illuminate\Auth\Access\Response;

class NhomPolicy
{
    /**
     * Quyền XEM (view): Admin, Giáo vụ, Trưởng khoa, GVHD, Thành viên nhóm.
     */
    public function view(Nguoidung $user, Nhom $nhom): Response
    {
        if ($this->isManager($user)) {
            return Response::allow();
        }

        if ($nhom->thanhviens()->where('ID_NGUOIDUNG', $user->ID_NGUOIDUNG)->exists()) {
            return Response::allow();
        }

        if ($user->giangvien && $nhom->phancongDetaiNhom && 
            $nhom->phancongDetaiNhom->ID_GVHD === $user->giangvien->ID_GIANGVIEN) {
            return Response::allow();
        }

        return Response::deny('Bạn không có quyền xem thông tin của nhóm này.');
    }

    /**
     * Quyền QUẢN LÝ (manage): Tạo task, xóa task, lên lịch họp...
     * Cho phép: Quản lý, GVHD, Nhóm trưởng.
     */
    public function manage(Nguoidung $user, Nhom $nhom): Response
    {
        if ($this->isManager($user)) {
            return Response::allow();
        }

        // Nhóm trưởng
        if ($nhom->ID_NHOMTRUONG === $user->ID_NGUOIDUNG) {
            return Response::allow();
        }

        // GVHD
        if ($user->giangvien && $nhom->phancongDetaiNhom && 
            $nhom->phancongDetaiNhom->ID_GVHD === $user->giangvien->ID_GIANGVIEN) {
            return Response::allow();
        }

        return Response::deny('Chỉ Nhóm trưởng hoặc Giảng viên hướng dẫn mới có quyền thực hiện hành động này.');
    }

    /**
     * Quyền CẬP NHẬT NHÓM (update): Đổi tên, đổi đề tài.
     * Cho phép: Quản lý, Nhóm trưởng.
     */
    public function update(Nguoidung $user, Nhom $nhom): Response
    {
        if ($this->isManager($user)) {
            return Response::allow();
        }

        // Chỉ Nhóm trưởng mới được sửa thông tin nhóm
        if ($nhom->ID_NHOMTRUONG === $user->ID_NGUOIDUNG) {
            return Response::allow();
        }

        return Response::deny('Chỉ Nhóm trưởng mới có quyền cập nhật thông tin nhóm.');
    }

    /**
     * Helper: Kiểm tra vai trò quản lý cấp cao
     */
    private function isManager(Nguoidung $user): bool
    {
        if ($user->vaitro && $user->vaitro->TEN_VAITRO === 'Admin') return true;

        if ($user->giangvien) {
            if (!$user->giangvien->relationLoaded('chucvus')) {
                $user->giangvien->load('chucvus');
            }
            $codes = $user->giangvien->chucvus->pluck('MA_CHUCVU')->toArray();
            return in_array('TRUONG_KHOA', $codes) || in_array('GIAO_VU', $codes) || in_array('PHO_KHOA', $codes);
        }
        return false;
    }
}