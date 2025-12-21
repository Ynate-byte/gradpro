<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Danh sách Đề tài Khóa luận</title>
<style>
    @font-face {
        font-family: 'Times New Roman';
        src: url('{{ storage_path('fonts/SVN-Times New Roman.ttf') }}') format('truetype');
    }
    @font-face {
        font-family: 'Times New Roman Bold';
        src: url('{{ storage_path('fonts/SVN-Times New Roman Bold.ttf') }}') format('truetype');
        font-weight: bold;
    }

    @page {
        margin: 1cm;
    }

    body {
        font-family: 'Times New Roman', serif;
        font-size: 11pt;
        line-height: 1.3;
    }

    .header-title {
        text-align: center;
        font-weight: bold;
        font-size: 16pt;
        text-transform: uppercase;
        margin-bottom: 20px;
    }

    /* --- CẤU HÌNH BẢNG ĐỂ TỰ ĐỘNG SANG TRANG --- */
    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11pt;
        table-layout: fixed;
        /* Cho phép ngắt trang bên trong bảng */
        page-break-inside: auto; 
    }

    /* Cấu hình dòng (row) */
    tr {
        /* Cho phép ngắt trang bên trong dòng nếu nội dung quá dài */
        page-break-inside: auto; 
        page-break-after: auto;
    }

    th, td {
        border: 1px solid black;
        padding: 6px;
        vertical-align: top;
        text-align: left;
        word-wrap: break-word;
        /* Đảm bảo nội dung trong ô cũng có thể bị ngắt */
        page-break-inside: auto; 
    }

    /* Lặp lại tiêu đề khi sang trang mới */
    thead {
        display: table-header-group;
    }
    
    tfoot {
        display: table-footer-group;
    }

    th {
        font-family: 'Times New Roman Bold';
        font-weight: bold;
        text-align: center;
        background-color: #f0f0f0;
        vertical-align: middle;
    }

    /* --- CÂN CHỈNH ĐỘ RỘNG CỘT (Đã tối ưu cho A3 Landscape) --- */
    .col-stt     { width: 3%; text-align: center; }
    .col-ten     { width: 15%; }
    .col-yeucau  { width: 54%; } /* Cột này rộng nhất để chứa nội dung dài */
    .col-gv      { width: 8%; }
    .col-email   { width: 10%; font-size: 10pt; word-break: break-all; }
    .col-bomon   { width: 5%; text-align: center; }
    .col-ghichu  { width: 5%; text-align: center; }

</style>
</head>
<body>

    <div class="header-title">
        DANH SÁCH KHÓA LUẬN CỬ NHÂN NGÀNH CNTT - HỌC KỲ {{ $plan->HOCKY }} NĂM HỌC {{ $plan->NAMHOC }}
    </div>

    <table>
        <thead>
            <tr>
                <th class="col-stt">STT</th>
                <th class="col-ten">Tên đề tài</th>
                <th class="col-yeucau">Yêu cầu & Nội dung</th> <th class="col-gv">GVHD</th>
                <th class="col-email">Email</th>
                <th class="col-bomon">Bộ môn</th>
                <th class="col-ghichu">Ghi chú</th>
            </tr>
        </thead>
        <tbody>
            @foreach($topics as $index => $topic)
            <tr>
                <td style="text-align: center;">{{ $index + 1 }}</td>
                <td>
                    <strong>{{ $topic->TEN_DETAI }}</strong>
                </td>
                <td>
                    {{-- Ưu tiên hiển thị Yêu cầu, nếu không thì Mô tả --}}
                    @if($topic->YEUCAU)
                        {!! nl2br(e($topic->YEUCAU)) !!}
                    @endif
                    
                    @if($topic->MOTA && $topic->YEUCAU)
                        <br><br><strong>Mô tả:</strong><br>
                    @endif
                    
                    @if($topic->MOTA)
                        {!! nl2br(e($topic->MOTA)) !!}
                    @endif
                </td>
                <td>{{ $topic->nguoiDexuat->nguoidung->HODEM_VA_TEN ?? '' }}</td>
                <td>{{ $topic->nguoiDexuat->nguoidung->EMAIL ?? '' }}</td>
                <td style="text-align: center;">{{ $topic->khoaBomon->MA_KHOA_BOMON ?? '' }}</td>
                <td style="text-align: center;">
                    {{ $topic->MUCTIEU ?? '' }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

</body>
</html>