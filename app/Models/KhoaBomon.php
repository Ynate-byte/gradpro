<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KhoaBomon extends Model
{
    use HasFactory;
    
    protected $table = 'KHOA_BOMON';
    protected $primaryKey = 'ID_KHOA_BOMON';
    public $timestamps = false;
    const CREATED_AT = 'NGAYTAO';
}