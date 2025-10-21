<?php

namespace App\Services;

use App\Models\KehoachKhoaluan;
use App\Models\Nguoidung;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

/**
 * Dịch vụ này xử lý logic tự động ghép nhóm cho sinh viên.
 */
class AutoGroupingService
{
    /**
     * Thực thi thuật toán ghép nhóm tự động.
     *
     * @param KehoachKhoaluan $plan Kế hoạch cần thực hiện ghép nhóm.
     * @param int $desiredMembers Số lượng thành viên mong muốn cho mỗi nhóm.
     * @param string $priority Tiêu chí ưu tiên khi ghép ('chuyennganh' hoặc 'lop').
     * @return array Kết quả của quá trình ghép nhóm.
     */
    public function execute(KehoachKhoaluan $plan, int $desiredMembers, string $priority)
    {
        return DB::transaction(function () use ($plan, $desiredMembers, $priority) {
            $membersAddedToExistingGroups = 0;
            $newGroupsCount = 0;
            $membersInNewGroups = 0;

            // BƯỚC 1: CHUẨN BỊ DỮ LIỆU VÀ GIẢI TÁN NHÓM 1 THÀNH VIÊN
            
            $studentsInGroupIds = ThanhvienNhom::query()
                ->whereHas('nhom', fn($q) => $q->where('ID_KEHOACH', $plan->ID_KEHOACH))
                ->pluck('ID_NGUOIDUNG');

            $availableStudents = Nguoidung::query()
                ->where('TRANGTHAI_KICHHOAT', true)
                ->whereHas('sinhvien.cacDotThamGia', fn($q) => $q->where('ID_KEHOACH', $plan->ID_KEHOACH))
                ->whereNotIn('ID_NGUOIDUNG', $studentsInGroupIds)
                ->with('sinhvien.chuyennganh')
                ->get()->shuffle();

            $targetGroups = $plan->nhoms()
                ->where('LA_NHOM_DACBIET', false)
                ->with('thanhviens.nguoidung.sinhvien.chuyennganh')
                ->get();
            
            list($loneLeaderGroups, $groupsToFill) = $targetGroups->partition(fn($group) => $group->SO_THANHVIEN_HIENTAI == 1);
            
            if ($loneLeaderGroups->isNotEmpty()) {
                $groupIdsToDelete = [];
                foreach ($loneLeaderGroups as $group) {
                    if ($group->thanhviens->first()?->nguoidung) {
                        $availableStudents->push($group->thanhviens->first()->nguoidung);
                    }
                    $groupIdsToDelete[] = $group->ID_NHOM;
                }
                Nhom::destroy($groupIdsToDelete);
            }

            // BƯỚC 2: LẤP ĐẦY CÁC NHÓM HIỆN CÓ
            
            foreach ($groupsToFill as $group) {
                if ($availableStudents->isEmpty() || $group->SO_THANHVIEN_HIENTAI >= $desiredMembers) {
                    continue;
                }

                $spaceLeft = $desiredMembers - $group->SO_THANHVIEN_HIENTAI;
                $studentsForThisGroup = new Collection();
                
                if ($priority === 'chuyennganh' && $group->ID_CHUYENNGANH) {
                    list($sameMajorStudents, $otherStudents) = $availableStudents->partition(
                        fn($student) => $student->sinhvien?->ID_CHUYENNGANH === $group->ID_CHUYENNGANH
                    );
                    $studentsForThisGroup = $sameMajorStudents->take($spaceLeft);
                    $availableStudents = $otherStudents->merge($sameMajorStudents->skip($spaceLeft));
                }
                
                $stillNeeded = $spaceLeft - $studentsForThisGroup->count();
                if ($stillNeeded > 0) {
                    $studentsForThisGroup = $studentsForThisGroup->merge($availableStudents->take($stillNeeded));
                    $availableStudents = $availableStudents->skip($stillNeeded);
                }

                if ($studentsForThisGroup->isNotEmpty()) {
                    $memberData = $studentsForThisGroup->map(fn($student) => [
                        'ID_NHOM' => $group->ID_NHOM,
                        'ID_NGUOIDUNG' => $student->ID_NGUOIDUNG,
                        'NGAY_VAONHOM' => now(),
                    ])->all();

                    ThanhvienNhom::insert($memberData);
                    $newMemberCount = count($memberData);
                    $group->increment('SO_THANHVIEN_HIENTAI', $newMemberCount);
                    
                    if ($group->SO_THANHVIEN_HIENTAI >= 4) {
                        $group->TRANGTHAI = 'Đã đủ thành viên';
                        $group->save();
                    }
                    $membersAddedToExistingGroups += $newMemberCount;
                }
            }

            // BƯỚC 3: TẠO NHÓM MỚI TỪ CÁC SINH VIÊN CÒN LẠI
            
            $studentsGroupedByPriority = $availableStudents->groupBy(function ($student) use ($priority) {
                if ($priority === 'chuyennganh') {
                    return $student->sinhvien?->ID_CHUYENNGANH ?? 'no_major';
                }
                return 'no_priority';
            });
            
            $leftoverStudents = collect();

            foreach ($studentsGroupedByPriority as $priorityId => $studentsInPriority) {
                foreach ($studentsInPriority->chunk($desiredMembers) as $chunk) {
                    if ($chunk->count() < 2) { 
                        $leftoverStudents = $leftoverStudents->merge($chunk);
                        continue;
                    }
                    
                    $leader = $chunk->first();
                    $majorCode = $leader->sinhvien?->chuyennganh?->MA_CHUYENNGANH ?? 'N/A';
                    
                    $newGroup = Nhom::create([
                        'ID_KEHOACH' => $plan->ID_KEHOACH,
                        'TEN_NHOM' => "Nhóm tự động - {$majorCode} - " . substr(uniqid(), -4),
                        'ID_NHOMTRUONG' => $leader->ID_NGUOIDUNG,
                        'ID_CHUYENNGANH' => $leader->sinhvien?->ID_CHUYENNGANH,
                        'SO_THANHVIEN_HIENTAI' => $chunk->count(),
                        'TRANGTHAI' => $chunk->count() >= 4 ? 'Đã đủ thành viên' : 'Đang mở',
                    ]);
                    $newGroupsCount++;

                    $membersToInsert = $chunk->map(fn(Nguoidung $student) => [
                        'ID_NHOM' => $newGroup->ID_NHOM,
                        'ID_NGUOIDUNG' => $student->ID_NGUOIDUNG,
                        'NGAY_VAONHOM' => now(),
                    ])->all();
                    ThanhvienNhom::insert($membersToInsert);
                    $membersInNewGroups += $chunk->count();
                }
            }

            return [
                'message' => 'Quá trình ghép nhóm tự động đã hoàn tất.',
                'newGroupsCreated' => $newGroupsCount,
                'membersAddedToExistingGroups' => $membersAddedToExistingGroups,
                'membersInNewGroups' => $membersInNewGroups,
                'leftoverStudents' => $leftoverStudents->values()->all(),
            ];
        });
    }
}
