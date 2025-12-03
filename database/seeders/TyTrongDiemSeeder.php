<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TyTrongDiemSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('TYTRONG_DIEM')->truncate();
        
        DB::table('TYTRONG_DIEM')->insert([
            'HUONGDAN' => 0.40, 
            'PHANBIEN' => 0.30, 
            'HOIDONG' => 0.30,  
            'ACTIVE' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}