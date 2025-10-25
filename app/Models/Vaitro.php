<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vaitro extends Model
{
    use HasFactory;

    protected $table = 'VAITRO';
    protected $primaryKey = 'ID_VAITRO';

    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = null;
}