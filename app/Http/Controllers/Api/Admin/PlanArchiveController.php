<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\KehoachKhoaluan;
use App\Models\FileNopSanpham;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use ZipArchive;
use Illuminate\Support\Facades\File;

class PlanArchiveController extends Controller
{
    /**
     * Sao lưu (Archive) một kế hoạch cụ thể
     * Params: include_files (boolean)
     */
    public function archive(Request $request, $id)
    {
        // 1. Kiểm tra tùy chọn có bao gồm file vật lý không
        $includeFiles = $request->boolean('include_files', false); // Mặc định là FALSE (chỉ DB)

        // 2. Tải dữ liệu (Giữ nguyên logic cũ)
        $plan = KehoachKhoaluan::with([
            'mocThoigians',
            'detais',
            'nhoms.thanhviens',
            'nhoms.phancongDetaiNhom.submissions.files',
            'nhoms.congViecs.checklistItems',
            'nhoms.congViecs.allComments',
            'nhoms.lichHops',
            'nhoms.diemTongKet',
            'nhoms.diemHuongDan',
            'nhoms.diemPhanBien',
            'nhoms.diemHoiDong',
            'hoidongs.giangviens',
            'sinhvienThamgias',
            'quotaKhoaBomons',
            'quotaGiangviens'
        ])->findOrFail($id);

        $timestamp = time();
        $tempDir = storage_path('app/temp_archive_' . $id . '_' . $timestamp);
        
        if (!File::exists($tempDir)) {
            File::makeDirectory($tempDir, 0755, true);
        }

        try {
            // 3. Tạo file JSON dữ liệu
            $jsonData = $plan->toJson(JSON_PRETTY_PRINT);
            File::put($tempDir . '/data.json', $jsonData);

            // 4. Copy các file vật lý (CHỈ KHI ĐƯỢC YÊU CẦU)
            if ($includeFiles) {
                $filesDir = $tempDir . '/files';
                File::makeDirectory($filesDir);
                
                foreach ($plan->nhoms as $nhom) {
                    if ($nhom->phancongDetaiNhom) {
                        foreach ($nhom->phancongDetaiNhom->submissions as $submission) {
                            foreach ($submission->files as $file) {
                                // Bỏ qua link, chỉ copy file thật
                                if ($file->DUONG_DAN_HOAC_NOI_DUNG && 
                                    !in_array($file->LOAI_FILE, ['LinkDemo', 'LinkRepository']) &&
                                    Storage::disk('local')->exists($file->DUONG_DAN_HOAC_NOI_DUNG)) {
                                    
                                    $destPath = $filesDir . '/' . $file->DUONG_DAN_HOAC_NOI_DUNG;
                                    $destDir = dirname($destPath);
                                    if (!File::exists($destDir)) {
                                        File::makeDirectory($destDir, 0755, true);
                                    }
                                    Storage::disk('local')->copy(
                                        $file->DUONG_DAN_HOAC_NOI_DUNG, 
                                        'temp_archive_' . $id . '_' . $timestamp . '/files/' . $file->DUONG_DAN_HOAC_NOI_DUNG
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // 5. Nén thành ZIP
            $suffix = $includeFiles ? '_FULL' : '_DB_ONLY';
            $zipFileName = 'archive_plan_' . $plan->KHOAHOC . $suffix . '_' . date('Ymd_His') . '.zip';
            $zipPath = storage_path('app/' . $zipFileName);
            
            $zip = new ZipArchive;
            if ($zip->open($zipPath, ZipArchive::CREATE) === TRUE) {
                // Thêm file data.json
                $zip->addFile($tempDir . '/data.json', 'data.json');

                // Thêm thư mục files (nếu có)
                if ($includeFiles && File::exists($tempDir . '/files')) {
                    $files = new \RecursiveIteratorIterator(
                        new \RecursiveDirectoryIterator($tempDir . '/files'),
                        \RecursiveIteratorIterator::LEAVES_ONLY
                    );

                    foreach ($files as $name => $file) {
                        if (!$file->isDir()) {
                            $filePath = $file->getRealPath();
                            $relativePath = 'files/' . substr($filePath, strlen($tempDir . '/files') + 1);
                            $zip->addFile($filePath, $relativePath);
                        }
                    }
                }
                $zip->close();
            }

            // 6. Dọn dẹp
            File::deleteDirectory($tempDir);

            return response()->download($zipPath)->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            File::deleteDirectory($tempDir);
            Log::error("Archive Failed: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi sao lưu: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Phục hồi (Restore) kế hoạch từ file ZIP
     */
    public function restore(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:zip|max:102400', // Max 100MB
        ]);

        $zipFile = $request->file('file');
        $tempDir = storage_path('app/temp_restore_' . time());
        
        try {
            // 1. Giải nén
            $zip = new ZipArchive;
            if ($zip->open($zipFile->getRealPath()) === TRUE) {
                $zip->extractTo($tempDir);
                $zip->close();
            } else {
                throw new \Exception("Không thể mở file ZIP.");
            }

            if (!File::exists($tempDir . '/data.json')) {
                throw new \Exception("File backup không hợp lệ (thiếu data.json).");
            }

            // 2. Đọc dữ liệu JSON
            $jsonContent = File::get($tempDir . '/data.json');
            $data = json_decode($jsonContent, true);

            DB::beginTransaction();

            // 3. Tái tạo Kế hoạch (Tạo ID mới để tránh xung đột)
            // Loại bỏ ID cũ và các timestamp
            $planData = collect($data)->except(['ID_KEHOACH', 'created_at', 'updated_at', 'NGAYTAO', 'NGAYCAPNHAT', 'moc_thoigians', 'detais', 'nhoms', 'hoidongs', 'sinhvien_thamgias', 'quota_khoa_bomons', 'quota_giangviens'])->toArray();
            
            // Đổi tên để biết là bản restore
            $planData['TEN_DOT'] = $planData['TEN_DOT'] . ' (Restored ' . date('H:i') . ')';
            $planData['TRANGTHAI'] = 'Bản nháp'; // Reset về nháp cho an toàn
            $planData['NGAYTAO'] = now();

            $newPlan = KehoachKhoaluan::create($planData);
            $newPlanId = $newPlan->ID_KEHOACH;

            // 4. Tái tạo các dữ liệu con
            // Lưu ý: Cần map ID cũ -> ID mới để giữ quan hệ
            
            // A. Mốc thời gian
            foreach ($data['moc_thoigians'] ?? [] as $moc) {
                $moc['ID_KEHOACH'] = $newPlanId;
                unset($moc['ID']);
                \App\Models\MocThoigian::create($moc);
            }

            // B. Sinh viên tham gia
            foreach ($data['sinhvien_thamgias'] ?? [] as $sv) {
                $sv['ID_KEHOACH'] = $newPlanId;
                unset($sv['ID_THAMGIA']);
                \App\Models\SinhvienThamgia::create($sv);
            }

            // C. Quota (Khoa/GV)
            foreach ($data['quota_khoa_bomons'] ?? [] as $q) {
                $q['ID_KEHOACH'] = $newPlanId;
                unset($q['ID_QUOTA']);
                \App\Models\QuotaKhoaBomon::create($q);
            }
            foreach ($data['quota_giangviens'] ?? [] as $q) {
                $q['ID_KEHOACH'] = $newPlanId;
                unset($q['ID_QUOTA']);
                \App\Models\QuotaGiangvien::create($q);
            }

            // D. Đề tài (Cần map ID để dùng cho phân công nhóm)
            $detaiIdMap = []; // Old_ID => New_ID
            foreach ($data['detais'] ?? [] as $dt) {
                $oldId = $dt['ID_DETAI'];
                $dt['ID_KEHOACH'] = $newPlanId;
                unset($dt['ID_DETAI']);
                // Reset trạng thái đề tài
                $newDetai = \App\Models\Detai::create($dt);
                $detaiIdMap[$oldId] = $newDetai->ID_DETAI;
            }

            // E. Hội đồng (Map ID để gán nhóm)
            $hoidongIdMap = [];
            foreach ($data['hoidongs'] ?? [] as $hd) {
                $oldId = $hd['ID_HOIDONG'];
                $hd['ID_KEHOACH'] = $newPlanId;
                unset($hd['ID_HOIDONG']);
                
                // Xử lý quan hệ giảng viên trong hội đồng
                $giangviens = $hd['giangviens'] ?? [];
                unset($hd['giangviens']);
                
                $newHoidong = \App\Models\Hoidong::create($hd);
                $hoidongIdMap[$oldId] = $newHoidong->ID_HOIDONG;

                // Attach giảng viên
                foreach ($giangviens as $gv) {
                    $newHoidong->giangviens()->attach($gv['ID_GIANGVIEN'], ['VAITRO' => $gv['pivot']['VAITRO']]);
                }
            }

            // F. Nhóm & Các dữ liệu sâu bên trong (Phức tạp nhất)
            foreach ($data['nhoms'] ?? [] as $nhomData) {
                $oldNhomId = $nhomData['ID_NHOM'];
                $nhomData['ID_KEHOACH'] = $newPlanId;
                unset($nhomData['ID_NHOM']);
                
                // Tách các quan hệ con ra
                $thanhviens = $nhomData['thanhviens'] ?? [];
                $phancong = $nhomData['phancong_detai_nhom'] ?? null;
                $congviecs = $nhomData['cong_viecs'] ?? [];
                $lichhops = $nhomData['lich_hops'] ?? [];
                
                // Xóa key quan hệ khỏi mảng chính để create
                unset($nhomData['thanhviens'], $nhomData['phancong_detai_nhom'], $nhomData['cong_viecs'], $nhomData['lich_hops'], $nhomData['diem_tong_ket'], $nhomData['diem_huong_dan'], $nhomData['diem_phan_bien'], $nhomData['diem_hoi_dong']);

                $newNhom = \App\Models\Nhom::create($nhomData);
                $newNhomId = $newNhom->ID_NHOM;

                // F1. Thành viên
                foreach ($thanhviens as $tv) {
                    $tv['ID_NHOM'] = $newNhomId;
                    unset($tv['ID_THANHVIEN']);
                    \App\Models\ThanhvienNhom::create($tv);
                }

                // F2. Phân công đề tài & Nộp bài
                if ($phancong) {
                    $phancong['ID_NHOM'] = $newNhomId;
                    // Map lại ID Đề tài mới
                    $phancong['ID_DETAI'] = $detaiIdMap[$phancong['ID_DETAI']] ?? null; 
                    unset($phancong['ID_PHANCONG']);
                    
                    $submissions = $phancong['submissions'] ?? [];
                    unset($phancong['submissions'], $phancong['detai'], $phancong['gvhd']);

                    $newPhanCong = \App\Models\PhancongDetaiNhom::create($phancong);

                    // Xử lý bài nộp & File
                    foreach ($submissions as $sub) {
                        $sub['ID_PHANCONG'] = $newPhanCong->ID_PHANCONG;
                        $files = $sub['files'] ?? [];
                        unset($sub['ID_NOP_SANPHAM'], $sub['files']);
                        
                        $newSub = \App\Models\NopSanpham::create($sub);

                        foreach ($files as $file) {
                            $file['ID_NOP_SANPHAM'] = $newSub->ID_NOP_SANPHAM;
                            $oldPath = $file['DUONG_DAN_HOAC_NOI_DUNG'];
                            
                            // Nếu là file vật lý, cần copy từ temp sang storage thật
                            // Cần đổi đường dẫn để khớp với plan mới/nhóm mới
                            // Old: submissions/plan_OLD/group_OLD/file.pdf
                            // New: submissions/plan_NEW/group_NEW/file.pdf
                            if ($file['LOAI_FILE'] !== 'LinkDemo' && $file['LOAI_FILE'] !== 'LinkRepository') {
                                $fileName = basename($oldPath);
                                $newPath = "submissions/plan_{$newPlanId}/group_{$newNhomId}/{$fileName}";
                                
                                // Tìm file trong thư mục giải nén
                                // Trong zip, nó nằm ở files/submissions/plan_OLD/group_OLD/file.pdf
                                // Do Storage copy ở hàm archive dùng path tương đối, nên trong zip nó sẽ có cấu trúc full path
                                $sourceFileInTemp = $tempDir . '/files/' . $oldPath;

                                if (File::exists($sourceFileInTemp)) {
                                    Storage::disk('local')->put($newPath, File::get($sourceFileInTemp));
                                    $file['DUONG_DAN_HOAC_NOI_DUNG'] = $newPath;
                                }
                            }
                            
                            unset($file['ID_FILE']);
                            \App\Models\FileNopSanpham::create($file);
                        }
                    }
                }
                
                // F3. Kanban Tasks (Đơn giản hóa: Chỉ tạo task, bỏ qua comment phức tạp nếu cần)
                foreach ($congviecs as $cv) {
                    $cv['ID_NHOM'] = $newNhomId;
                    $checklists = $cv['checklist_items'] ?? [];
                    unset($cv['ID_CONGVIEC'], $cv['checklist_items'], $cv['all_comments']);
                    
                    $newCv = \App\Models\CongViec::create($cv);
                    
                    foreach ($checklists as $ck) {
                        $ck['ID_CONGVIEC'] = $newCv->ID_CONGVIEC;
                        unset($ck['ID_MUCON']);
                        \App\Models\DanhSachKiemTraCongViec::create($ck);
                    }
                }
            }

            DB::commit();
            File::deleteDirectory($tempDir);

            return response()->json(['message' => 'Phục hồi kế hoạch thành công!'], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            File::deleteDirectory($tempDir);
            Log::error("Restore Plan Failed: " . $e->getMessage() . " line " . $e->getLine());
            return response()->json(['message' => 'Lỗi phục hồi: ' . $e->getMessage()], 500);
        }
    }
}