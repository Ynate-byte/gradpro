<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;

abstract class Controller
{
    protected function getUserRoleName()
    {
        return Auth::user()?->vaitro?->TEN_VAITRO;
    }

    protected function getUserPositionCodes(): array
    {
        $user = Auth::user();
        if ($user && $user->giangvien) {
            if (!$user->giangvien->relationLoaded('chucvus')) {
                $user->giangvien->load('chucvus');
            }
            return $user->giangvien->chucvus->pluck('MA_CHUCVU')->toArray();
        }
        return [];
    }

    protected function isAdmin()
    {
        return $this->getUserRoleName() === 'Admin';
    }

    protected function isTruongKhoa()
    {
        return $this->isAdmin() || in_array('TRUONG_KHOA', $this->getUserPositionCodes());
    }

    protected function isGiaoVu()
    {
        $positions = $this->getUserPositionCodes();
        
        return $this->isAdmin() || 
               in_array('GIAO_VU', $positions) || 
               in_array('PHO_KHOA', $positions);
    }
    
    protected function isTruongBoMon()
    {
        return $this->isAdmin() || in_array('TRUONG_BOMON', $this->getUserPositionCodes());
    }

    protected function canCreatePlan(): bool
    {
        if (!Auth::check()) return false;
        return $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();
    }

    protected function canApproveSubmissions(): bool
    {
        if (!Auth::check()) return false;
        return $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();
    }
}