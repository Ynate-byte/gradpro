<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Thông báo Kế hoạch Khóa luận - {{ $plan->TEN_DOT }}</title>
    <style>
        @font-face {
            font-family: 'Times New Roman';
            src: url('{{ storage_path('fonts/SVN-Times New Roman.ttf') }}') format('truetype');
        }
        @font-face {
            font-family: 'Times New Roman';
            src: url('{{ storage_path('fonts/SVN-Times New Roman Bold.ttf') }}') format('truetype');
            font-weight: bold;
        }
        @font-face {
            font-family: 'Times New Roman';
            src: url('{{ storage_path('fonts/SVN-Times New Roman Italic.ttf') }}') format('truetype');
            font-style: italic;
        }

        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 0.8;
            color: #000;
        }

        .container {
            padding: 0 35px;
        }

        .header {
            width: 100%;
            border-spacing: 0;
            /* margin-bottom: 5px; */
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
            width: 55%;
            margin: 2px auto 4px auto;
        }
        .header .date {
            font-style: italic;
            font-weight: normal;
        }

        .main-title {
            text-align: center;
            /* margin-bottom: 5px; */
            line-height: 0.5;
            
        }
        .main-title h1 {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 2px;
            text-transform: uppercase;
        }
        .main-title h2 {
            font-size: 12pt;
            font-weight: bold;
            line-height: 1;
        }

        .content {
            text-align: justify;
        }
        .content p {
            margin: 0 0 6px 0;
            text-indent: 35px;
            font-size: 13pt;
        }
        .content p.no-indent {
            text-indent: 30px;
            
        }
        .section-title {
            font-size: 13.5pt;
        }
        .content .section-title {
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 5px;
            text-indent: 0;
        }
        .sub-item{
            font-size: 13pt;
        }
        .content .sub-item {
            padding-left: 35px;
        }

        .plan-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            border: 1px solid black;
            font-size: 12pt;
        }
        .plan-table th, .plan-table td {
            border: 1px solid black;
            padding: 5px;
            vertical-align: top;
        }
        .plan-table th {
            font-weight: bold;
            text-align: center;
        }
        .plan-table .stt {
            text-align: center;
            width: 8%;
        }
        .plan-table .content-cell {
            white-space: pre-line;
        }

        .footer-text {
            margin-top: 10px;
            text-align: justify;
            font-size: 14.2pt;
            text-indent: 35px;
        }

        .signature-section {
            width: 100%;
            margin-top: 25px;
        }
        .signature-table {
            width: 100%;
        }
        .signature-table td {
            vertical-align: top;
            padding-top: 10px;
        }
        .recipient {
            width: 50%;
            font-style: italic;
            font-size: 10.5pt;
        }
        .recipient .list-item {
            margin-left: 15px;
        }
        .signature-block {
            text-align: center;
            width: 50%;
        }
        .signature-block .title {
            font-weight: bold;
        }
        .signature-block .signature-space {
            height: 60px;
        }
        .signature-block .name {
            font-weight: bold;
        }
        .indent-block {
              margin-left: 35px;  
     }
     .section-title .normal-text {
    font-weight: normal;
}
.plan-table .col-stt {
    width: 10%; /* cột số thứ tự nhỏ */
    text-align: center;
}
.plan-table .col-content {
    width: 75%; /* cột nội dung chiếm phần lớn */
}
.plan-table .col-time {
    width: 15%; /* cột thời gian */
    text-align: center;
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
                    <p style="margin-top: 6px;">Số: ....../TB-KCNTT</p>
                </td>
                <td>
                    <div style="font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
                    <hr>
                    <div class="date" style="margin-top: 6px;">Thành phố Hồ Chí Minh, ngày {{ now()->day }} tháng {{ now()->month }} năm {{ now()->year }}</div>
                </td>
            </tr>
        </table>

        <div class="main-title">
            <h1>THÔNG BÁO</h1>
            <h2>V/v Triển khai kế hoạch thực hiện Khóa luận {{ $plan->HEDAOTAO }} của khóa {{ $plan->KHOAHOC }}<br>
            các ngành CNTT và ATTT học kỳ {{ $plan->HOCKY }} năm học {{ $plan->NAMHOC }}</h2>
        </div>

        <div class="content">
            <p class="no-indent">- Căn cứ vào tiến độ đào tạo học kỳ {{ $plan->HOCKY }} năm học {{ $plan->NAMHOC }};</p>
            <p class="no-indent">- Căn cứ số lượng sinh viên đăng ký học phần Khóa luận {{ $plan->HEDAOTAO }} trong học kỳ {{ $plan->HOCKY }} năm học {{ $plan->NAMHOC }};</p>
            <p class="no-indent">- Căn cứ kế hoạch số 25/KH-KCNTT ngày 27/08/2025 của Khoa CNTT về tổ chức và triển khai Khóa luận cử nhân Khóa {{ $plan->KHOAHOC }} cho các ngành CNTT và ATTT;</p>
            <p style="margin-top: 10px;">Khoa Công nghệ thông tin thông báo kế hoạch triển khai Khóa luận {{ $plan->HEDAOTAO }} Khóa {{ $plan->KHOAHOC }} các ngành CNTT và ATTT như sau:</p>

            <div class= "indent-block">
                <div class="section-title">1. Yêu cầu chung:</div>
                @php
                    $thucHienDeTai = $plan->mocThoigians->firstWhere('TEN_SUKIEN', 'Nhóm sinh viên thực hiện đề tài');
                @endphp
                <div class="sub-item">• Thời gian thực hiện trong 12 tuần từ <strong>{{ $thucHienDeTai ? \Carbon\Carbon::parse($thucHienDeTai->NGAY_BATDAU)->format('d/m/Y') : '[N/A]' }}</strong> đến <strong>{{ $thucHienDeTai ? \Carbon\Carbon::parse($thucHienDeTai->NGAY_KETTHUC)->format('d/m/Y') : '[N/A]' }}</strong>.</div>
            </div>

            <div class= "indent-block">
                
                    <div class="section-title">2. Danh sách Sinh viên đăng ký học phần Khóa luận {{ $plan->HEDAOTAO }}: <span class="normal-text">file đính kèm thông báo.</span></div>
                
            </div>

            <div>
                <div class= "indent-block">
                    <div class="section-title">3. Kế hoạch thực hiện:</div>
                </div>
                <table class="plan-table">
                    <thead>
                        <tr>
                               <th class="col-stt">STT</th>
                               <th class="col-content">Nội dung thực hiện</th>
                               <th class="col-time">Thời gian thực hiện</th>
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

        <p class="footer-text">
            Trên đây là Thông báo kế hoạch thực hiện Khóa luận {{ $plan->HEDAOTAO }} học kỳ {{ $plan->HOCKY }} năm học {{ $plan->NAMHOC }} của Khoa.
            Trong quá trình thực hiện nếu có các điều chỉnh các mốc thời gian cho phù hợp tình hình thực tế, Khoa sẽ thông báo cụ thể đến sinh viên.
            Sinh viên phải thường xuyên theo dõi các thông báo trên bảng tin của website Khoa.
        </p>

        <table class="signature-table">
            <tr>
                <td class="recipient">
                    <div><strong>Nơi nhận:</strong></div>
                    <div class="list-item">- SV CNTT</div>
                    <div class="list-item">- Lưu: VT.</div>
                </td>
                <td class="signature-block">
                    <div class="title">TRƯỞNG KHOA</div>
                    <div class="signature-space"></div>
                    <div class="name">Nguyễn Hồng Vũ</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
