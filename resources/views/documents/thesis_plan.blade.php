<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Thông báo Kế hoạch Khóa luận - {{ $plan->TEN_DOT }}</title>
    <style>
        /* Đảm bảo các file font đã được đặt trong thư mục storage/fonts/ */
        @font-face {
            font-family: 'Times New Roman';
            src: url('{{ storage_path('fonts/SVN-Times New Roman.ttf') }}') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        @font-face {
            font-family: 'Times New Roman';
            src: url('{{ storage_path('fonts/SVN-Times New Roman Bold.ttf') }}') format('truetype');
            font-weight: bold;
            font-style: normal;
        }
        @font-face {
            font-family: 'Times New Roman';
            src: url('{{ storage_path('fonts/SVN-Times New Roman Italic.ttf') }}') format('truetype');
            font-weight: normal;
            font-style: italic;
        }
        @font-face {
            font-family: 'Times New Roman';
            src: url('{{ storage_path('fonts/SVN-Times New Roman Bold Italic.ttf') }}') format('truetype');
            font-weight: bold;
            font-style: italic;
        }

        body {
            font-family: 'Times New Roman', serif;
            font-size: 13pt;
            line-height: 1.5;
            color: #000;
        }

        .container {
            padding: 0 40px;
        }

        .header {
            width: 100%;
            border-spacing: 0;
            margin-bottom: 30px;
        }
        .header td {
            width: 50%;
            text-align: center;
            vertical-align: top;
        }
        .header .school-name {
            text-transform: uppercase;
        }
        .header .department-name {
            font-weight: bold;
            text-transform: uppercase;
        }
        .header .motto {
            font-weight: bold;
        }
        .header hr {
            border: none;
            border-top: 1px solid black;
            width: 60%;
            margin: 2px auto 5px auto;
        }
        .header .date {
            font-style: italic;
            font-weight: normal;
        }

        .main-title {
            text-align: center;
            margin-bottom: 25px;
        }
        .main-title h1 {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        .main-title h2 {
            font-size: 14pt;
            font-weight: bold;
        }

        .content {
            text-align: justify;
        }
        .content p {
            margin: 0 0 10px 0;
            text-indent: 40px; /* Thụt lề đầu dòng */
        }
        .content p.no-indent {
            text-indent: 0;
        }
        .content .section-title {
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 8px;
            text-indent: 0;
        }
        .content .sub-item {
            padding-left: 40px;
        }

        .plan-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            border: 1px solid black;
        }
        .plan-table th, .plan-table td {
            border: 1px solid black;
            padding: 8px;
            vertical-align: top;
            text-align: left;
        }
        .plan-table th {
            font-weight: bold;
            text-align: center;
        }
        .plan-table .stt {
            text-align: center;
        }
        .plan-table .content-cell {
            white-space: pre-line; /* Cho phép tự động xuống dòng với ký tự \n */
        }

        .signature-section {
            width: 100%;
            margin-top: 40px;
        }
        .signature-block {
            width: 45%;
            margin-left: 55%;
            text-align: center;
        }
        .signature-block .title {
            font-weight: bold;
        }
        .signature-block .signature-space {
            height: 80px;
        }
        .signature-block .name {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <table class="header">
            <tr>
                <td>
                    <div class="school-name">TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG</div>
                    <div class="school-name">THÀNH PHỐ HỒ CHÍ MINH</div>
                    <div class="department-name">KHOA CÔNG NGHỆ THÔNG TIN</div>
                    <hr>
                    <p style="margin-top: 10px; font-weight: normal;">Số: ....../TB-KCNTT</p>
                </td>
                <td>
                    <div style="font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
                    <hr>
                    <div class="date" style="margin-top: 10px;">Thành phố Hồ Chí Minh, ngày {{ now()->day }} tháng {{ now()->month }} năm {{ now()->year }}</div>
                </td>
            </tr>
        </table>

        <div class="main-title">
            <h1>THÔNG BÁO</h1>
            <h2>V/v Triển khai kế hoạch thực hiện Khóa luận cử nhân của khóa {{ $plan->KHOAHOC }}<br>
            các ngành CNTT và ATTT học kỳ {{ $plan->HOCKY }} năm học {{ $plan->NAMHOC }}</h2>
        </div>

        <div class="content">
            <p class="no-indent">- Căn cứ vào tiến độ đào tạo học kỳ {{ $plan->HOCKY }} năm học {{ $plan->NAMHOC }};</p>
            <p class="no-indent">- Căn cứ số lượng sinh viên đăng ký học phần Khóa luận cử nhân trong học kỳ {{ $plan->HOCKY }} năm học {{ $plan->NAMHOC }};</p>
            <p class="no-indent">- Căn cứ kế hoạch số 25/KH-KCNTT ngày 27/08/2025 của Khoa CNTT về tổ chức và triển khai Khóa luận cử nhân Khóa {{ $plan->KHOAHOC }} cho các ngành CNTT và ATTT;</p>
            <p style="margin-top: 15px;">Khoa Công nghệ thông tin thông báo kế hoạch triển khai Khóa luận cử nhân Khóa {{ $plan->KHOAHOC }} các ngành CNTT và ATTT như sau:</p>

            <div>
                <div class="section-title">1. Yêu cầu chung:</div>
                @php
                    $thucHienDeTai = $plan->mocThoigians->firstWhere('TEN_SUKIEN', 'Nhóm sinh viên thực hiện đề tài');
                @endphp
                <div class="sub-item">• Thời gian thực hiện trong 12 tuần từ <strong>{{ $thucHienDeTai ? \Carbon\Carbon::parse($thucHienDeTai->NGAY_BATDAU)->format('d/m/Y') : '[N/A]' }}</strong> đến <strong>{{ $thucHienDeTai ? \Carbon\Carbon::parse($thucHienDeTai->NGAY_KETTHUC)->format('d/m/Y') : '[N/A]' }}</strong>.</div>
            </div>

            <div>
                <div class="section-title">2. Danh sách Sinh viên đăng ký học phần Khóa luận cử nhân: file đính kèm thông báo.</div>
            </div>

            <div>
                <div class="section-title">3. Kế hoạch thực hiện:</div>
                <table class="plan-table">
                    <thead>
                        <tr>
                            <th style="width: 8%;">STT</th>
                            <th style="width: 62%;">Nội dung thực hiện</th>
                            <th style="width: 30%;">Thời gian thực hiện</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($plan->mocThoigians->sortBy('NGAY_BATDAU') as $index => $moc)
                            <tr>
                                <td class="stt">{{ $index + 1 }}</td>
                                <td class="content-cell">{{ $moc->TEN_SUKIEN }}{{ $moc->MOTA ? "\n" . $moc->MOTA : '' }}</td>
                                <td style="text-align: center;">
                                    @php
                                        $ngayBatDau = \Carbon\Carbon::parse($moc->NGAY_BATDAU)->format('d/m/Y');
                                        $ngayKetThuc = \Carbon\Carbon::parse($moc->NGAY_KETTHUC)->format('d/m/Y');
                                    @endphp
                                    @if($ngayBatDau == $ngayKetThuc)
                                        Ngày {{ $ngayBatDau }}
                                    @else
                                        Từ {{ $ngayBatDau }}<br>Đến {{ $ngayKetThuc }}
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="3" style="text-align: center; font-style: italic;">Chưa có mốc thời gian nào được thêm vào.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <div class="signature-section">
             <div class="signature-block">
                <div class="title">TRƯỞNG KHOA</div>
                <div class="signature-space"></div>
                <div class="name">Nguyễn Hồng Vũ</div>
            </div>
        </div>
    </div>
</body>
</html>