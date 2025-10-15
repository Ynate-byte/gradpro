<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            VaitroSeeder::class,
            ChuyennganhSeeder::class,
            KhoaBomonSeeder::class,
            NguoidungSeeder::class,
        ]);
    }
}