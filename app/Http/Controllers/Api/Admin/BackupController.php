<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB; // <--- Bắt buộc có dòng này
use Carbon\Carbon;
use ZipArchive; // <--- Bắt buộc có dòng này

class BackupController extends Controller
{
    /**
     * Lấy danh sách các file backup hiện có
     */
    public function index()
    {
        $backupFolder = env('APP_NAME', 'Laravel'); 

        $disk = Storage::disk('local');
        
        if (!$disk->exists($backupFolder)) {
            if ($disk->exists('Laravel')) {
                $backupFolder = 'Laravel';
            } else {
                return response()->json([]);
            }
        }

        $files = $disk->allFiles($backupFolder);
        $backups = [];

        foreach ($files as $file) {
            if (str_ends_with($file, '.zip')) {
                $backups[] = [
                    'name' => basename($file),
                    'path' => $file,
                    'size' => $this->formatSize($disk->size($file)),
                    'created_at' => Carbon::createFromTimestamp($disk->lastModified($file))->format('H:i d/m/Y'),
                    'age' => Carbon::createFromTimestamp($disk->lastModified($file))->diffForHumans()
                ];
            }
        }

        usort($backups, fn($a, $b) => $b['created_at'] <=> $a['created_at']);

        return response()->json($backups);
    }

    /**
     * Tạo bản backup mới
     */
    public function create(Request $request)
    {
        $option = $request->input('option', 'full'); 

        try {
            set_time_limit(300); 

            $tempPath = storage_path('app/backup-temp');
            if (File::exists($tempPath)) {
                File::deleteDirectory($tempPath);
            }

            if ($option === 'db') {
                Artisan::call('backup:run --only-db --disable-notifications');
                $message = 'Đã tạo bản sao lưu Cơ sở dữ liệu thành công!';
            } else {
                Artisan::call('backup:run --disable-notifications');
                $message = 'Đã tạo bản sao lưu Toàn hệ thống thành công!';
            }
            
            $output = Artisan::output();
            Log::info("Backup Created ($option): " . $output);

            return response()->json(['message' => $message]);

        } catch (\Exception $e) {
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
     * [MỚI] Phục hồi dữ liệu từ file backup (Chỉ phục hồi Database)
     */
    public function restore(Request $request)
    {
        $path = $request->input('path');
        $disk = Storage::disk('local');

        if (!$path || !$disk->exists($path)) {
            return response()->json(['message' => 'File backup không tồn tại.'], 404);
        }

        // Tăng thời gian thực thi
        set_time_limit(300);

        $tempDir = storage_path('app/restore-temp');
        // Tạo thư mục tạm nếu chưa có
        if (!File::exists($tempDir)) {
            File::makeDirectory($tempDir, 0755, true);
        } else {
            // Dọn dẹp nếu còn rác cũ
            File::cleanDirectory($tempDir);
        }

        try {
            // 1. Giải nén file Backup
            $zip = new ZipArchive;
            $fullPath = $disk->path($path);
            
            if ($zip->open($fullPath) === TRUE) {
                $zip->extractTo($tempDir);
                $zip->close();
            } else {
                throw new \Exception("Không thể giải nén file backup.");
            }

            // 2. Tìm file SQL dump
            // Spatie backup thường lưu sql trong thư mục 'db-dumps'
            $sqlFiles = File::glob($tempDir . '/db-dumps/*.sql');
            
            if (empty($sqlFiles)) {
                throw new \Exception("Không tìm thấy file SQL database trong bản backup này. Có thể đây là bản backup chỉ chứa files.");
            }

            $sqlFile = $sqlFiles[0]; // Lấy file đầu tiên tìm thấy

            // 3. Tiến hành Restore Database
            DB::disableQueryLog();
            
            // Tắt kiểm tra khóa ngoại để tránh lỗi khi drop bảng
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            
            // Đọc nội dung file SQL
            $sql = file_get_contents($sqlFile);
            
            if (!$sql) {
                throw new \Exception("File SQL rỗng hoặc không đọc được.");
            }

            // Thực thi SQL (Hàm này chạy nhiều câu lệnh cùng lúc)
            DB::unprepared($sql);

            // Bật lại kiểm tra khóa ngoại
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            // 4. Dọn dẹp thư mục tạm
            File::deleteDirectory($tempDir);

            // Ghi log
            Log::info("Database restored from: " . $path);

            return response()->json(['message' => 'Phục hồi cơ sở dữ liệu thành công! Hệ thống sẽ tải lại.']);

        } catch (\Exception $e) {
            // Dọn dẹp nếu lỗi
            if (File::exists($tempDir)) {
                File::deleteDirectory($tempDir);
            }
            
            Log::error("Restore Failed: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi phục hồi: ' . $e->getMessage()], 500);
        }
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