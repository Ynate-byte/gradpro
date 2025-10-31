<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreThesisPlanRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'TEN_DOT' => 'required|string|max:100',
            'NAMHOC' => 'required|string|max:20',
            'HOCKY' => 'required|in:1,2,3',
            'KHOAHOC' => 'required|string|max:10',
            'HEDAOTAO' => 'required|in:Cử nhân,Kỹ sư,Thạc sỹ',
            'SO_TUAN_THUCHIEN' => 'required|integer|min:1|max:52',
            'NGAY_BATDAU' => 'required|date',
            'NGAY_KETHUC' => 'required|date|after_or_equal:NGAY_BATDAU',
            'mocThoigians' => 'required|array|min:1',
            'mocThoigians.*.TEN_SUKIEN' => 'required|string|max:255',
            'mocThoigians.*.NGAY_BATDAU' => 'required|date',
            'mocThoigians.*.NGAY_KETTHUC' => 'required|date|after_or_equal:mocThoigians.*.NGAY_BATDAU',
            'mocThoigians.*.MOTA' => 'nullable|string',
            'mocThoigians.*.VAITRO_THUCHIEN' => 'nullable|string|max:255',
        ];
    }
}