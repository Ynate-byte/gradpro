<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Nguoidung;
use App\Models\Nhom;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void { }

    public function boot(): void
    {
        if (!$this->app->runningInConsole()) {
            Gate::define('access-grading-admin', function (?Nguoidung $user) {
                if (!$user) return false;
                $role = $user->vaitro?->TEN_VAITRO;
                $position = $user->giangvien?->CHUCVU;
                return $role === 'Admin' || $role === 'Trưởng khoa' || $role === 'Giáo vụ' 
                    || $position === 'Trưởng khoa' || $position === 'Giáo vụ';
            });

            Gate::define('grade-huongdan', function (?Nguoidung $user, Nhom $nhom) {
                if (!$user || !$user->giangvien) return false;
                $gvhdId = $nhom->phancongDetaiNhom?->ID_GVHD;
                return $user->giangvien->ID_GIANGVIEN === $gvhdId;
            });

            Gate::define('grade-phanbien', function (?Nguoidung $user, Nhom $nhom) {
                if (!$user || !$user->giangvien) return false;
                $hoidongPhanBien = $nhom->hoidongs()->where('LOAI', 'phanbien')->first();
                if (!$hoidongPhanBien) return false;
                return $hoidongPhanBien->hasGiangvien($user->giangvien->ID_GIANGVIEN);
            });

            Gate::define('grade-hoidong', function (?Nguoidung $user, Nhom $nhom) {
                if (!$user || !$user->giangvien) return false;
                $hoidongBaoVe = $nhom->hoidongs()->where('LOAI', 'hoidong')->first();
                if (!$hoidongBaoVe) return false;
                return $hoidongBaoVe->hasGiangvien($user->giangvien->ID_GIANGVIEN);
            });
        }
    }
}