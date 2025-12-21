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

        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.3;
            margin: 0.5cm;
        }

        .header-title {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            text-transform: uppercase;
            margin-bottom: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt; /* Chữ trong bảng nhỏ hơn một chút để vừa */
        }

        th, td {
            border: 1px solid black;
            padding: 5px;
            vertical-align: middle;
            text-align: left;
        }

        th {
            font-family: 'Times New Roman Bold';
            font-weight: bold;
            text-align: center;
            background-color: #f0f0f0;
        }

        /* Độ rộng các cột tương đối theo ảnh */
        .col-stt { width: 5%; text-align: center; }
        .col-ten { width: 20%; }
        .col-yeucau { width: 30%; }
        .col-gv { width: 15%; }
        .col-email { width: 15%; word-break: break-all; }
        .col-bomon { width: 8%; text-align: center; }
        .col-ghichu { width: 7%; text-align: center; }

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
                <th class="col-yeucau">Yêu cầu</th>
                <th class="col-gv">GVHD</th>
                <th class="col-email">Email</th>
                <th class="col-bomon">Bộ môn</th>
                <th class="col-ghichu">Ghi chú</th>
            </tr>
        </thead>
        <tbody>
            @foreach($topics as $index => $topic)
            <tr>
                <td style="text-align: center;">{{ $index + 1 }}</td>
                <td>{{ $topic->TEN_DETAI }}</td>
                <td>
                    {{-- Hiển thị Yêu cầu, nếu không có thì lấy Mô tả --}}
                    @if($topic->YEUCAU)
                        {!! nl2br(e($topic->YEUCAU)) !!}
                    @else
                        {!! nl2br(e($topic->MOTA)) !!}
                    @endif
                </td>
                <td>{{ $topic->nguoiDexuat->nguoidung->HODEM_VA_TEN ?? '' }}</td>
                <td>{{ $topic->nguoiDexuat->nguoidung->EMAIL ?? '' }}</td>
                <td style="text-align: center;">{{ $topic->khoaBomon->MA_KHOA_BOMON ?? '' }}</td>
                <td>
                    {{-- Ví dụ: Hiển thị mục tiêu hoặc loại đề tài --}}
                    {{ $topic->MUCTIEU ?? '' }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

</body>
</html>