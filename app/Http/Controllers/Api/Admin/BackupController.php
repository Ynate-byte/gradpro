<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Carbon\Carbon;

class BackupController extends Controller
{
    /**
     * Lấy danh sách các file backup hiện có
     */
    public function index()
    {
        // Lấy tên ứng dụng để xác định thư mục lưu backup
        // Spatie backup thường lưu trong storage/app/[APP_NAME]
        $backupFolder = env('APP_NAME', 'Laravel'); 

        $disk = Storage::disk('local');
        
        // Kiểm tra thư mục có tồn tại không
        if (!$disk->exists($backupFolder)) {
            // Nếu không thấy, thử tìm thư mục 'Laravel' mặc định
            if ($disk->exists('Laravel')) {
                $backupFolder = 'Laravel';
            } else {
                return response()->json([]);
            }
        }

        $files = $disk->allFiles($backupFolder);
        $backups = [];

        foreach ($files as $file) {
            // Chỉ lấy file .zip
            if (str_ends_with($file, '.zip')) {
                $backups[] = [
                    'name' => basename($file),
                    'path' => $file, // Đường dẫn tương đối để download/delete
                    'size' => $this->formatSize($disk->size($file)),
                    'created_at' => Carbon::createFromTimestamp($disk->lastModified($file))->format('H:i d/m/Y'),
                    'age' => Carbon::createFromTimestamp($disk->lastModified($file))->diffForHumans()
                ];
            }
        }

        // Sắp xếp: Mới nhất lên đầu
        usort($backups, fn($a, $b) => $b['created_at'] <=> $a['created_at']);

        return response()->json($backups);
    }

    /**
     * Tạo bản backup mới
     * Nhận tham số 'option': 'full' hoặc 'db'
     */
    public function create(Request $request)
    {
        // Mặc định là full nếu không chọn
        $option = $request->input('option', 'full'); 

        try {
            // Tăng thời gian thực thi lên 5 phút để tránh timeout khi nén file
            set_time_limit(300); 

            // Kiểm tra và xóa thư mục tạm 'backup-temp' nếu nó còn tồn tại do lần chạy trước bị lỗi
            $tempPath = storage_path('app/backup-temp');
            if (File::exists($tempPath)) {
                File::deleteDirectory($tempPath);
                Log::info("Đã dọn dẹp thư mục tạm cũ: " . $tempPath);
            }

            if ($option === 'db') {
                Artisan::call('backup:run --only-db --disable-notifications');
                $message = 'Đã tạo bản sao lưu Cơ sở dữ liệu thành công!';
            } else {
                // BACKUP TOÀN BỘ (Database + Files)
                Artisan::call('backup:run --disable-notifications');
                $message = 'Đã tạo bản sao lưu Toàn hệ thống thành công!';
            }
            
            // Ghi log kết quả
            $output = Artisan::output();
            Log::info("Backup Created ($option): " . $output);

            return response()->json(['message' => $message]);

        } catch (\Exception $e) {
            // Nếu có lỗi xảy ra, cũng cố gắng dọn dẹp lại lần nữa để lần sau không bị kẹt
            $tempPath = storage_path('app/backup-temp');
            if (File::exists($tempPath)) {
                File::deleteDirectory($tempPath);
            }

            Log::error("Backup Failed: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi khi tạo backup: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Tải file backup về máy
     */
    public function download(Request $request)
    {
        $path = $request->query('path');
        
        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'File không tồn tại.'], 404);
        }

        return Storage::disk('local')->download($path);
    }

    /**
     * Xóa file backup
     */
    public function destroy(Request $request)
    {
        $path = $request->input('path');
        
        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'File không tồn tại.'], 404);
        }

        Storage::disk('local')->delete($path);
        return response()->json(['message' => 'Đã xóa bản backup thành công.']);
    }

    /**
     * Helper: Format dung lượng file
     */
    private function formatSize($bytes)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        for ($i = 0; $bytes > 1024; $i++) $bytes /= 1024;
        return round($bytes, 2) . ' ' . $units[$i];
    }
}