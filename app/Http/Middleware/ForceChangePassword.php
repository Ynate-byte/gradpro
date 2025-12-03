<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceChangePassword
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->LA_DANGNHAP_LANDAU) {
            $allowedRoutes = [
                'api/user/change-password',
                'api/logout',
                'api/me'
            ];

            if (!in_array($request->path(), $allowedRoutes)) {
                return response()->json([
                    'message' => 'Tài khoản của bạn cần đổi mật khẩu lần đầu để tiếp tục.',
                    'action_required' => 'change_password'
                ], 403);
            }
        }

        return $next($request);
    }
}