<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\Auth;

abstract class Controller
{
    protected function getUserRoleName()
    {
        return Auth::user()?->vaitro?->TEN_VAITRO;
    }

    protected function getUserPositionName()
    {
        return Auth::user()?->giangvien?->CHUCVU;
    }

    protected function isAdmin()
    {
        return $this->getUserRoleName() === 'Admin';
    }

    protected function isTruongKhoa()
    {
        return $this->getUserRoleName() === 'Trưởng khoa' || $this->getUserPositionName() === 'Trưởng khoa';
    }

    protected function isGiaoVu()
    {
        return $this->getUserRoleName() === 'Giáo vụ' || $this->getUserPositionName() === 'Giáo vụ';
    }

    protected function canCreatePlan(): bool
    {
        if (!Auth::check()) {
            return false;
        }
        return $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();
    }

    protected function canApproveSubmissions(): bool
    {
        if (!Auth::check()) {
            return false;
        }
        return $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();
    }
}
