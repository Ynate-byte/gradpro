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
     * Lấy danh sách file và thư mục (Phiên bản bảo mật)
     * Không nhận raw path, chỉ nhận ID để server tự build path.
     */
    public function index(Request $request)
    {
        // 1. Kiểm tra quyền hạn (Chỉ Admin, Giáo vụ, Trưởng khoa)
        if (!$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // 2. Validate input (Chỉ chấp nhận ID số nguyên)
        $request->validate([
            'plan_id'  => 'nullable|integer',
            'group_id' => 'nullable|integer',
        ]);

        try {
            $rootPath = 'submissions';
            $currentPath = $rootPath;
            $level = 'root';

            if ($request->plan_id) {
                $currentPath .= '/plan_' . $request->plan_id;
                $level = 'plan';
                
                if ($request->group_id) {
                    $currentPath .= '/group_' . $request->group_id;
                    $level = 'group';
                }
            }

            $disk = Storage::disk('local'); 

            if (!$disk->exists($currentPath)) {
                return response()->json([
                    'current_path' => $currentPath,
                    'breadcrumbs'  => $this->buildSafeBreadcrumbs($request->plan_id, $request->group_id),
                    'data'         => []
                ]);
            }

            // 4. Lấy danh sách file và folder vật lý
            $rawDirs = $disk->directories($currentPath);
            $rawFiles = $disk->files($currentPath);
            $items = [];

            // Chuẩn bị data mapping để tránh query N+1 trong vòng lặp
            $folderMap = [];
            
            if ($level === 'root') {
                // Đang ở root -> Lấy danh sách Kế hoạch
                $planIds = [];
                foreach ($rawDirs as $dir) {
                    if (preg_match('/plan_(\d+)$/', basename($dir), $matches)) {
                        $planIds[] = $matches[1];
                    }
                }
                $folderMap = KehoachKhoaluan::whereIn('ID_KEHOACH', $planIds)->pluck('TEN_DOT', 'ID_KEHOACH');
            } 
            elseif ($level === 'plan') {
                $groupIds = [];
                foreach ($rawDirs as $dir) {
                    if (preg_match('/group_(\d+)$/', basename($dir), $matches)) {
                        $groupIds[] = $matches[1];
                    }
                }
                $folderMap = Nhom::whereIn('ID_NHOM', $groupIds)->pluck('TEN_NHOM', 'ID_NHOM');
            }

            foreach ($rawDirs as $dirPath) {
                $dirName = basename($dirPath);
                $displayName = $dirName;
                $metadata = null;
                $navigateParams = [];

                if ($level === 'root' && preg_match('/^plan_(\d+)$/', $dirName, $matches)) {
                    $pid = $matches[1];
                    $displayName = isset($folderMap[$pid]) ? "KH: " . $folderMap[$pid] : $dirName;
                    $navigateParams = ['plan_id' => $pid];
                } 
                elseif ($level === 'plan' && preg_match('/^group_(\d+)$/', $dirName, $matches)) {
                    $gid = $matches[1];
                    $displayName = isset($folderMap[$gid]) ? " " . $folderMap[$gid] : $dirName;
                    $navigateParams = ['plan_id' => $request->plan_id, 'group_id' => $gid];
                }

                $items[] = [
                    'type'          => 'folder',
                    'name'          => $displayName,
                    'real_name'     => $dirName,
                    'path'          => $dirPath, // Path vật lý (để debug hoặc xóa)
                    'navigate'      => $navigateParams, // Frontend dùng cái này để gọi lại API index
                    'last_modified' => date('Y-m-d H:i:s', $disk->lastModified($dirPath)),
                    'items_count'   => count($disk->files($dirPath)) + count($disk->directories($dirPath)),
                ];
            }

            $dbFiles = FileNopSanpham::whereIn('DUONG_DAN_HOAC_NOI_DUNG', $rawFiles)
                ->get()
                ->keyBy('DUONG_DAN_HOAC_NOI_DUNG');

            foreach ($rawFiles as $filePath) {
                if (str_starts_with(basename($filePath), '.')) continue;

                $fileInfo = $dbFiles->get($filePath);
                $realName = basename($filePath);
                $displayName = $fileInfo ? $fileInfo->TEN_FILE_GOC : $realName;

                $items[] = [
                    'type'          => 'file',
                    'id'            => $fileInfo ? $fileInfo->ID_FILE : null,
                    'name'          => $displayName,
                    'real_name'     => $realName,
                    'path'          => $filePath,
                    'size'          => $this->formatSize($disk->size($filePath)),
                    'extension'     => strtolower(pathinfo($filePath, PATHINFO_EXTENSION)),
                    'last_modified' => date('Y-m-d H:i:s', $disk->lastModified($filePath)),
                    // URL tải xuống an toàn qua SecureFileController (cần route này)
                    'download_url'  => $fileInfo ? "/api/secure-download/{$fileInfo->ID_FILE}" : null 
                ];
            }

            return response()->json([
                'current_level' => $level,
                'breadcrumbs'   => $this->buildSafeBreadcrumbs($request->plan_id, $request->group_id),
                'data'          => $items
            ]);

        } catch (\Exception $e) {
            Log::error("FileManager Error: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi Server: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Helper: Tạo Breadcrumbs dựa trên ID thay vì parse chuỗi
     */
    private function buildSafeBreadcrumbs($planId, $groupId)
    {
        $crumbs = [
            ['name' => 'Thư mục gốc', 'params' => []] // Root
        ];

        if ($planId) {
            $planName = KehoachKhoaluan::where('ID_KEHOACH', $planId)->value('TEN_DOT') ?? "Plan $planId";
            $crumbs[] = [
                'name' => $planName,
                'params' => ['plan_id' => $planId]
            ];
        }

        if ($groupId) {
            $groupName = Nhom::where('ID_NHOM', $groupId)->value('TEN_NHOM') ?? "Group $groupId";
            $crumbs[] = [
                'name' => $groupName,
                'params' => ['plan_id' => $planId, 'group_id' => $groupId]
            ];
        }

        return $crumbs;
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