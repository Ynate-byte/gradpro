<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Nguoidung;
use App\Models\Nhom;
use App\Policies\NhomPolicy;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(function () {
            $rule = Password::min(8)
                ->letters()
                ->mixedCase()
                ->numbers();

            if ($this->app->isProduction()) {
                $rule->uncompromised();
            }

            return $rule;
        });

        Gate::policy(Nhom::class, NhomPolicy::class);

        if (!$this->app->runningInConsole()) {
            
            Gate::define('access-grading-admin', function (?Nguoidung $user) {
                if (!$user) return false;
                
                $role = $user->vaitro?->TEN_VAITRO;
                if ($role === 'Admin') return true;

                if ($user->giangvien) {
                    $positionCodes = $user->giangvien->chucvus->pluck('MA_CHUCVU')->toArray();

                    return in_array('TRUONG_KHOA', $positionCodes) 
                        || in_array('GIAO_VU', $positionCodes) 
                        || in_array('PHO_KHOA', $positionCodes);
                }

                return false;
            });

            Gate::define('grade-huongdan', function (?Nguoidung $user, Nhom $nhom) {
                if (!$user || !$user->giangvien) return false;
                
                $gvhdId = $nhom->phancongDetaiNhom?->ID_GVHD;
                return $user->giangvien->ID_GIANGVIEN === $gvhdId;
            });

            Gate::define('grade-phanbien', function (?Nguoidung $user, Nhom $nhom) {
                if (!$user || !$user->giangvien) return false;
                
                $hoidongPhanBien = $nhom->hoidongs->where('LOAI', 'phanbien')->first();
                
                if (!$hoidongPhanBien) return false;
                return $hoidongPhanBien->hasGiangvien($user->giangvien->ID_GIANGVIEN);
            });

            Gate::define('grade-hoidong', function (?Nguoidung $user, Nhom $nhom) {
                if (!$user || !$user->giangvien) return false;
                
                $hoidongBaoVe = $nhom->hoidongs->whereIn('LOAI', ['hoidong', 'hoidong5'])->first();
                
                if (!$hoidongBaoVe) return false;
                
                return $hoidongBaoVe->hasGiangvien($user->giangvien->ID_GIANGVIEN);
            });
        }
    }
}