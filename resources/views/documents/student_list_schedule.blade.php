<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Danh sách Hội đồng</title>
    <style>
        /* --- 1. CẤU HÌNH FONT CHỮ --- */
        @font-face {
            font-family: 'Times New Roman';
            src: url('{{ storage_path('fonts/SVN-Times New Roman.ttf') }}') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        @font-face {
            font-family: 'Times New Roman Bold';
            src: url('{{ storage_path('fonts/SVN-Times New Roman Bold.ttf') }}') format('truetype');
            font-weight: bold;
            font-style: normal;
        }
        @font-face {
            font-family: 'Times New Roman Italic';
            src: url('{{ storage_path('fonts/SVN-Times New Roman Italic.ttf') }}') format('truetype');
            font-weight: normal;
            font-style: italic;
        }

        /* --- 2. CẤU HÌNH TRANG GIẤY --- */
        @page {
            margin: 1cm 1cm; /* Lề 1cm đều 4 cạnh */
        }

        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.1; /* Giãn dòng nhỏ gọn */
            color: #000;
        }

        /* --- 3. HEADER VĂN BẢN --- */
        .header-top {
            text-align: right;
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 5px;
        }
        .doc-title {
            text-align: center;
            font-weight: bold;
            font-size: 13pt;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .doc-subtitle {
            text-align: center;
            font-weight: bold;
            font-size: 13pt;
            text-transform: uppercase;
        }
        .doc-note {
            text-align: center;
            font-size: 11pt;
            font-style: italic;
            margin-top: 5px;
            margin-bottom: 15px;
        }

        .council-title {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11pt;
            margin-top: 15px;
            margin-bottom: 5px;
            text-align: left;
            text-decoration: none;
        }

        /* --- 4. CẤU HÌNH BẢNG (TABLE) --- */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11pt;
            table-layout: fixed; /* BẮT BUỘC: Để cố định độ rộng cột */
        }

        th, td {
            border: 1px solid #000;
            padding: 3px 2px; /* Padding nhỏ để tiết kiệm diện tích */
            vertical-align: middle; /* Căn giữa theo chiều dọc */
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        th {
            font-family: 'Times New Roman Bold';
            font-weight: bold;
            text-align: center;
            height: 40px; /* Chiều cao header cố định */
            background-color: #fff;
        }

        /* Kỹ thuật tách bảng để xử lý ngắt trang */
        .header-table { border-bottom: none; }
        .content-table { margin-top: -1px; } /* Đẩy lên 1px để viền trùng với bảng trên */

        /* Wrapper bọc mỗi nhóm đề tài -> Ép không bị ngắt trang giữa chừng */
        .topic-group {
            page-break-inside: avoid;
            width: 100%;
        }

        /* --- 5. ĐỊNH NGHĨA ĐỘ RỘNG CỘT (CSS CLASSES) --- */
        /* Tổng cộng = 100% */
        .w-stt     { width: 4%; text-align: center; }
        .w-mssv    { width: 9%; text-align: center; }
        .w-holot   { width: 16%; text-align: left; border-right: none; }
        .w-ten     { width: 7%; text-align: center; font-weight: bold; border-left: none; }
        .w-detai   { width: 43%; text-align: center; } /* Tăng tối đa cho Tên đề tài */
        .w-gv      { width: 14%; text-align: left; }
        .w-note    { width: 7%; text-align: center; }


        /* --- 6. FOOTER (CHỮ KÝ) --- */
        .footer-wrapper {
            margin-top: 30px;
            page-break-inside: avoid; /* Không cho phép ngắt trang trong vùng ký tên */
            width: 100%;
        }
        .footer-table {
            width: 100%;
            border: none;
        }
        .footer-table td {
            border: none;
            text-align: center;
            vertical-align: top;
            padding: 0;
        }
        .signer-title {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11pt;
            margin-top: 5px;
        }
        .signer-name {
            font-weight: bold;
            font-size: 11pt;
        }
        .date-line {
            font-style: italic;
            margin-bottom: 5px;
            font-size: 11pt;
        }

    </style>
</head>
<body>

    <div class="header-top">PHỤ LỤC 2:</div>
    <div class="doc-title">DANH SÁCH SINH VIÊN ĐẠI HỌC BẢO VỆ KHÓA LUẬN TỐT NGHIỆP</div>
    <div class="doc-subtitle">NGÀNH CÔNG NGHỆ THÔNG TIN, KHOA CÔNG NGHỆ THÔNG TIN HỌC KỲ {{ $plan->HOCKY }} NĂM HỌC {{ $plan->NAMHOC }}</div>

    <div class="doc-note">
        (Ban hành kèm theo Quyết định số ...../QĐ-DCT ngày ... tháng ... năm {{ now()->year }} <br>
        của Hiệu trưởng Trường Đại học Công Thương TP. Hồ Chí Minh)
    </div>

    @php $globalStt = 1; @endphp

    @foreach($councils as $council)

        <div class="council-title">{{ $council['ten_hoi_dong'] }}</div>

        <table class="header-table">
            <thead>
                <tr>
                    <th class="w-stt">STT</th>
                    <th class="w-mssv">Mã sinh viên</th>
                    <th style="align: right; border-right: none;">Họ và tên</th>
                    <th class="w-ten" style="border-left: none;"></th>
                    <th class="w-detai">Tên Khóa luận tốt nghiệp</th>
                    <th class="w-gv">Người hướng dẫn <br> Khóa luận tốt nghiệp</th>
                    <th class="w-note">Ghi chú</th>
                </tr>
            </thead>
        </table>

        @foreach($council['topics'] as $topic)
            <div class="topic-group">
                <table class="content-table">
                    <tbody>
                        @php $studentCount = count($topic['sinh_viens']); @endphp

                        @foreach($topic['sinh_viens'] as $index => $sv)
                            <tr>
                                <td class="w-stt">{{ $globalStt++ }}</td>
                                <td class="w-mssv">{{ $sv['mssv'] }}</td>

                                <td class="w-holot" style="border-right: 1px solid transparent;">
                                    {{ $sv['ho_lot'] }}
                                </td>

                                <td class="w-ten" style="border-left: 1px solid transparent;">
                                    {{ $sv['ten'] }}
                                </td>

                                @if($index === 0)
                                    <td class="w-detai" rowspan="{{ $studentCount }}">
                                        {{ $topic['ten_detai'] }}
                                    </td>
                                    <td class="w-gv" rowspan="{{ $studentCount }}">
                                        {{ $topic['gvhd'] }}
                                    </td>
                                    <td class="w-note" rowspan="{{ $studentCount }}">
                                        </td>
                                @endif
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endforeach

        <div style="margin-bottom: 20px;"></div>
    @endforeach

    <div class="footer-wrapper">
        <table class="footer-table">
            <tr>
                <td style="width: 35%;">
                    <div class="signer-title">
                        KT. HIỆU TRƯỞNG<br>
                        PHÓ HIỆU TRƯỞNG
                    </div>

                    <div style="height: 80px;"></div> <div class="signer-name">
                        PGS.TS. Lê Thị Hồng Ánh
                    </div>
                </td>

                <td style="width: 30%;">
                    <div class="signer-title">
                        PHÒNG ĐÀO TẠO
                    </div>

                    <div style="height: 80px;"></div>

                    <div class="signer-name">
                        Nguyễn Thanh Nguyên
                    </div>
                </td>

                <td style="width: 35%;">
                    <div class="date-line">TP. Hồ Chí Minh, ngày ... tháng ... năm {{ now()->year }}</div>

                    <div class="signer-title">
                        TRƯỞNG KHOA
                    </div>

                    <div style="height: 80px;"></div>

                    <div class="signer-name">
                        {{ isset($truongKhoaName) ? mb_strtoupper($truongKhoaName, 'UTF-8') : '' }}
                    </div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>