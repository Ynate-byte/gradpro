<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\KehoachKhoaluan;
use App\Models\Nhom;
use App\Models\FileNopSanpham;
use ZipArchive;

class FileManagerController extends Controller
{
    /**
     * Lấy danh sách file và thư mục.
     * Thực hiện ánh xạ (mapping) từ tên thư mục hệ thống (ID) sang tên hiển thị (Tên đề tài/Nhóm) từ Database.
     */
    public function index(Request $request)
    {
        // 1. Kiểm tra quyền hạn (Chỉ Admin, Giáo vụ, Trưởng khoa mới được truy cập)
        if (!$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $path = $request->input('folder', '/');

            // Chuẩn hóa đường dẫn đầu vào
            if ($path === 'root' || $path === '' || $path === null) {
                $path = '/';
            }

            // Bảo mật: Chặn hành vi path traversal (dùng ../ để truy cập thư mục hệ thống)
            if (str_contains($path, '..')) {
                return response()->json(['message' => 'Invalid path'], 400);
            }

            $disk = Storage::disk('public');
            
            // Nếu thư mục yêu cầu không tồn tại, quay về thư mục gốc
            if (!$disk->exists($path)) {
                $path = '/';
            }

            // 2. Lấy danh sách thô (đường dẫn vật lý) từ ổ cứng
            $rawDirs = $disk->directories($path);
            $rawFiles = $disk->files($path);

            // ====================================================
            // 🟡 PHẦN 1: XỬ LÝ MAPPING TÊN THƯ MỤC (PLAN / GROUP)
            // ====================================================
            $planIds = [];
            $groupIds = [];

            // Quét tên các thư mục để lấy ID phục vụ query DB (giảm thiểu số lần query)
            foreach ($rawDirs as $dirPath) {
                $dirName = basename($dirPath);

                // Regex bắt pattern "plan_123"
                if (preg_match('/^plan_(\d+)$/', $dirName, $matches)) {
                    $planIds[] = $matches[1];
                } 
                // Regex bắt pattern "group_456"
                elseif (preg_match('/^group_(\d+)$/', $dirName, $matches)) {
                    $groupIds[] = $matches[1];
                }
            }

            // Lấy thông tin Kế hoạch từ DB
            $plans = !empty($planIds) 
                ? KehoachKhoaluan::whereIn('ID_KEHOACH', $planIds)->pluck('TEN_DOT', 'ID_KEHOACH') 
                : collect();
            
            // Lấy thông tin Nhóm và Đề tài từ DB
            $groups = collect();
            if (!empty($groupIds)) {
                $groups = Nhom::with(['phancongDetaiNhom.detai'])
                    ->whereIn('ID_NHOM', $groupIds)
                    ->get()
                    ->keyBy('ID_NHOM');
            }

            $directories = [];
            foreach ($rawDirs as $dirPath) {
                $dirName = basename($dirPath);
                $displayName = $dirName; // Mặc định hiển thị tên gốc
                $metadata = null;

                // Ánh xạ tên thư mục Kế hoạch (VD: plan_1 -> 📂 KH: Kóa luận 2024)
                if (preg_match('/^plan_(\d+)$/', $dirName, $matches)) {
                    $id = $matches[1];
                    if (isset($plans[$id])) {
                        $displayName = "📂 KH: " . $plans[$id]; 
                        $metadata = "ID: plan_{$id}";
                    }
                }
                // Ánh xạ tên thư mục Nhóm (VD: group_5 -> 👥 Nhóm 1 - Website Bán Hàng)
                elseif (preg_match('/^group_(\d+)$/', $dirName, $matches)) {
                    $id = $matches[1];
                    if (isset($groups[$id])) {
                        $g = $groups[$id];
                        $topicName = $g->phancongDetaiNhom?->detai?->TEN_DETAI ?? 'Chưa có đề tài';
                        $displayName = "👥 " . $g->TEN_NHOM; 
                        $metadata = $topicName;
                    }
                }

                $directories[] = [
                    'type' => 'folder',
                    'name' => $displayName,
                    'real_name' => $dirName,
                    'path' => $dirPath,
                    'metadata' => $metadata,
                    'items_count' => count($disk->files($dirPath)) + count($disk->directories($dirPath)),
                    'last_modified' => date('Y-m-d H:i:s', $disk->lastModified($dirPath)),
                ];
            }

            // ====================================================
            // 🟢 PHẦN 2: XỬ LÝ MAPPING TÊN FILE TỪ DATABASE
            // ====================================================
            
            // Lấy tên gốc từ bảng FILE_NOP_SANPHAM dựa trên đường dẫn hash/lưu trữ
            $dbSubmissionFiles = FileNopSanpham::whereIn('DUONG_DAN_HOAC_NOI_DUNG', $rawFiles)
                ->pluck('TEN_FILE_GOC', 'DUONG_DAN_HOAC_NOI_DUNG');

            $files = [];
            foreach ($rawFiles as $file) {
                // Bỏ qua các file ẩn hệ thống (ví dụ .gitignore)
                if (str_starts_with(basename($file), '.')) continue; 

                $realName = basename($file);
                $displayName = $realName; 
                $metadata = null;

                // Nếu tìm thấy mapping trong DB -> hiển thị tên file gốc (dễ đọc cho người dùng)
                if (isset($dbSubmissionFiles[$file])) {
                    $displayName = $dbSubmissionFiles[$file]; 
                    $metadata = "File nộp bài (" . substr($realName, 0, 8) . "...)"; 
                }

                $files[] = [
                    'type' => 'file',
                    'name' => $displayName,
                    'real_name' => $realName,
                    'path' => $file,
                    'metadata' => $metadata,
                    'size' => $this->formatSize($disk->size($file)),
                    'extension' => strtolower(pathinfo($file, PATHINFO_EXTENSION)),
                    'url' => $disk->url($file),
                    'last_modified' => date('Y-m-d H:i:s', $disk->lastModified($file)),
                ];
            }

            return response()->json([
                'current_path' => $path,
                'breadcrumbs' => $this->makeBreadcrumbs($path),
                'data' => array_merge($directories, $files)
            ]);

        } catch (\Exception $e) {
            Log::error("FileManager Error: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi Server: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Upload File lên hệ thống.
     * Xử lý tự động đổi tên nếu file bị trùng lặp.
     */
    public function upload(Request $request)
    {
        if (!$this->isAdmin() && !$this->isGiaoVu()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'path' => 'required|string',
            'files' => 'required|array',
            'files.*' => 'file|max:102400', // Giới hạn 100MB mỗi file
        ]);

        $path = $request->input('path');
        $uploadedCount = 0;

        foreach ($request->file('files') as $file) {
            $filename = $file->getClientOriginalName();
            
            // Logic xử lý trùng tên: thêm số đếm (1), (2)...
            $i = 1;
            while (Storage::disk('public')->exists($path . '/' . $filename)) {
                $filename = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . " ($i)." . $file->getClientOriginalExtension();
                $i++;
            }
            
            Storage::disk('public')->putFileAs($path, $file, $filename);
            $uploadedCount++;
        }

        return response()->json(['message' => "Đã upload thành công {$uploadedCount} file."]);
    }

    /**
     * Tạo thư mục mới.
     */
    public function createFolder(Request $request)
    {
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $path = $request->input('path');
        $name = $request->input('name');
        
        // Validate tên thư mục: chỉ cho phép chữ, số, gạch dưới, gạch ngang
        if (!preg_match('/^[a-zA-Z0-9_\-\s]+$/', $name)) {
            return response()->json(['message' => 'Tên thư mục không hợp lệ'], 400);
        }

        $newPath = $path . '/' . $name;
        if (Storage::disk('public')->exists($newPath)) {
            return response()->json(['message' => 'Thư mục đã tồn tại'], 409);
        }

        Storage::disk('public')->makeDirectory($newPath);
        return response()->json(['message' => 'Tạo thư mục thành công']);
    }

    /**
     * Xóa file hoặc thư mục (Xử lý đơn lẻ).
     */
    public function delete(Request $request)
    {
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $path = $request->input('path');
        
        return $this->performDelete($path) 
            ? response()->json(['message' => 'Đã xóa thành công'])
            : response()->json(['message' => 'Không tìm thấy file/thư mục'], 404);
    }

    /**
     * Xóa hàng loạt (Bulk Delete).
     */
    public function bulkDelete(Request $request)
    {
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $items = $request->input('items', []);
        $deletedCount = 0;

        foreach ($items as $path) {
            if ($this->performDelete($path)) {
                $deletedCount++;
            }
        }

        return response()->json(['message' => "Đã xóa {$deletedCount} mục."]);
    }

    /**
     * Tải xuống đơn lẻ (GET).
     * Hỗ trợ trả về tên file gốc nếu có trong DB.
     */
    public function download(Request $request)
    {
        if (!$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $path = $request->query('path');
        $disk = Storage::disk('public');

        if (!$disk->exists($path)) {
            abort(404, 'File not found');
        }

        // TRƯỜNG HỢP 1: Là File đơn lẻ -> Tải trực tiếp (Stream)
        if (is_file($disk->path($path))) {
            // Tra cứu tên gốc từ DB để khi tải về người dùng thấy tên đúng
            $dbFile = FileNopSanpham::where('DUONG_DAN_HOAC_NOI_DUNG', $path)->first();
            $downloadName = $dbFile ? $dbFile->TEN_FILE_GOC : basename($path);

            return $disk->download($path, $downloadName);
        }

        // TRƯỜNG HỢP 2: Là Thư mục -> Chuyển sang xử lý nén Zip
        return $this->processDownload([$path], basename($path));
    }

    /**
     * Tải xuống hàng loạt (POST).
     * Nén nhiều file/thư mục thành 1 file Zip.
     */
    public function bulkDownload(Request $request)
    {
        if (!$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $paths = $request->input('paths', []);
        if (empty($paths)) {
            return response()->json(['message' => 'No files selected'], 400);
        }

        $zipName = 'archive_' . date('Ymd_His');
        
        // Nếu chỉ chọn 1 thư mục thì lấy tên thư mục đó làm tên file zip
        if (count($paths) === 1) {
            $zipName = basename($paths[0]);
        }

        return $this->processDownload($paths, $zipName);
    }

    // ====================================================
    // PRIVATE HELPERS (Các hàm hỗ trợ xử lý Logic cốt lõi)
    // ====================================================

    /**
     * Thực hiện lệnh xóa vật lý trên ổ đĩa.
     */
    private function performDelete($path)
    {
        $disk = Storage::disk('public');
        if (!$disk->exists($path)) return false;

        if (is_file($disk->path($path))) {
            return $disk->delete($path);
        } else {
            return $disk->deleteDirectory($path);
        }
    }

    /**
     * Helper xử lý tạo file Zip và trả về response download.
     * Logic phức tạp: 
     * 1. Gom tất cả file vật lý cần nén (kể cả trong thư mục con).
     * 2. Tra cứu tên gốc từ DB để đổi tên file hash thành tên thật.
     * 3. Xử lý trùng tên file trong file Zip.
     */
    private function processDownload(array $paths, $downloadName)
    {
        $disk = Storage::disk('public');
        
        

        // Nếu danh sách chỉ có 1 file đơn lẻ thì tải luôn, không cần Zip
        if (count($paths) === 1 && is_file($disk->path($paths[0]))) {
            $path = $paths[0];
            $dbFile = FileNopSanpham::where('DUONG_DAN_HOAC_NOI_DUNG', $path)->first();
            $name = $dbFile ? $dbFile->TEN_FILE_GOC : basename($path);
            return $disk->download($path, $name);
        }

        // Tạo thư mục tạm để chứa file zip
        $tempDir = 'temp_zips';
        if (!$disk->exists($tempDir)) $disk->makeDirectory($tempDir);

        if (!str_ends_with($downloadName, '.zip')) {
            $downloadName .= '.zip';
        }

        $zipFilePath = $disk->path($tempDir . '/' . $downloadName);

        // [BƯỚC 1] Lấy danh sách toàn bộ file cần nén (Map: Path vật lý => Path tương đối trong zip)
        $allPhysicalFiles = $this->getAllPhysicalFiles($disk, $paths);
        
        // [BƯỚC 2] Tra cứu tên gốc cho toàn bộ file này (Query 1 lần tối ưu hiệu năng)
        $nameMap = FileNopSanpham::whereIn('DUONG_DAN_HOAC_NOI_DUNG', array_keys($allPhysicalFiles))
            ->pluck('TEN_FILE_GOC', 'DUONG_DAN_HOAC_NOI_DUNG')
            ->toArray();

        $zip = new ZipArchive;
        if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            
            // Mảng theo dõi tên file đã thêm vào zip để xử lý trùng lặp
            $usedZipNames = []; 

            foreach ($allPhysicalFiles as $physicalPath => $relativePathFolder) {
                // Lấy tên file gốc từ DB, nếu không có thì dùng tên hash/tên vật lý
                $originalFilename = $nameMap[$physicalPath] ?? basename($physicalPath);
                
                // Tạo đường dẫn đầy đủ bên trong file Zip
                // Ví dụ: $relativePathFolder="group_1/", $originalFilename="BaoCao.pdf"
                $zipEntryPath = $relativePathFolder . $originalFilename;

                // [XỬ LÝ TRÙNG TÊN TRONG ZIP]
                // Ví dụ: 2 file khác nhau (hash khác nhau) nhưng cùng tên gốc "BaoCao.pdf".
                // Cần đổi thành "BaoCao (1).pdf" để tránh ghi đè hoặc lỗi zip.
                while (isset($usedZipNames[$zipEntryPath])) {
                    $info = pathinfo($originalFilename);
                    $ext = $info['extension'] ?? '';
                    $name = $info['filename'];
                    $count = $usedZipNames[$zipEntryPath] + 1;
                    $usedZipNames[$zipEntryPath]++; // Tăng biến đếm cho path cũ
                    
                    // Tạo tên mới: BaoCao (1).pdf
                    $originalFilename = "{$name} ({$count})" . ($ext ? ".{$ext}" : "");
                    $zipEntryPath = $relativePathFolder . $originalFilename; 
                }
                
                $usedZipNames[$zipEntryPath] = 1; 

                // Thêm file vào Zip với tên mới (đẹp)
                $zip->addFile($disk->path($physicalPath), $zipEntryPath);
            }
            $zip->close();
        } else {
            abort(500, 'Could not create ZIP file');
        }

        // Trả về file download và tự động xóa file zip tạm sau khi gửi xong
        return response()->download($zipFilePath)->deleteFileAfterSend(true);
    }

    /**
     * Đệ quy lấy tất cả file vật lý từ danh sách input paths.
     * Trả về mảng dạng: ['path/vat/ly/file.pdf' => 'folder/trong/zip/']
     */
    private function getAllPhysicalFiles($disk, $inputPaths)
    {
        $results = [];

        foreach ($inputPaths as $rootPath) {
            if (is_file($disk->path($rootPath))) {
                // Nếu input là file lẻ, nó nằm ngay root của zip (relative path rỗng)
                $results[$rootPath] = ''; 
            } else {
                // Nếu input là folder, lấy tất cả file bên trong (đệ quy của Laravel Storage)
                $files = $disk->allFiles($rootPath);
                $rootFolderName = basename($rootPath); // Ví dụ: group_1

                foreach ($files as $file) {
                    // Tính đường dẫn tương đối để giữ cấu trúc thư mục trong file zip
                    // $file = "submissions/plan_1/group_1/code/index.php"
                    // $rootPath = "submissions/plan_1/group_1"
                    
                    // Cắt bỏ phần rootPath để lấy phần đuôi: "code/index.php"
                    $subPath = substr($file, strlen($rootPath) + 1); 
                    $dirName = dirname($subPath); // "code"
                    
                    // Tạo path folder trong zip: "group_1/code/"
                    if ($dirName === '.') {
                        $zipRelativePath = $rootFolderName . '/';
                    } else {
                        $zipRelativePath = $rootFolderName . '/' . $dirName . '/';
                    }

                    $results[$file] = $zipRelativePath;
                }
            }
        }

        return $results;
    }

    /**
     * Format dung lượng file sang đơn vị dễ đọc (KB, MB, GB).
     */
    private function formatSize($bytes)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        for ($i = 0; $bytes > 1024; $i++) $bytes /= 1024;
        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Tạo breadcrumbs điều hướng thư mục.
     */
    private function makeBreadcrumbs($path)
    {
        $parts = array_filter(explode('/', $path));
        $crumbs = [['name' => 'Root', 'path' => '/']];
        $current = '';
        foreach ($parts as $part) {
            $current .= ($current == '/' ? '' : '/') . $part;
            $crumbs[] = ['name' => $part, 'path' => $current];
        }
        return $crumbs;
    }
}