<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Kế hoạch Bảo vệ Khóa luận</title>
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
        @font-face {
            font-family: 'Times New Roman Italic';
            src: url('{{ storage_path('fonts/SVN-Times New Roman Italic.ttf') }}') format('truetype');
            font-style: italic;
        }

        body {
            font-family: 'Times New Roman', serif;
            font-size: 13pt;
            line-height: 1.15;
            margin-top: 0.5cm;
            margin-left: 0.5cm; 
            margin-right: 0.5cm;
        }

        /* HEADER QUỐC HIỆU */
        .header-table { width: 100%; margin-bottom: 20px; }
        .header-table td { vertical-align: top; text-align: center; }
        
        .org-name { font-size: 11pt; }
        .dept-name { font-size: 11pt; font-weight: bold; }
        .ref-number { font-size: 11pt; margin-top: 5px; }
        
        .nation { font-size: 11pt; font-weight: bold; }
        .motto { font-size: 11pt; font-weight: bold; padding-bottom: 5px; border-bottom: 1px solid black; display: inline-block; }
        
        .date { font-size: 11pt; font-style: italic; margin-top: 10px; }

        /* TIÊU ĐỀ CHÍNH */
        .doc-title { text-align: center; font-weight: bold; font-size: 14pt; margin-top: 15px; margin-bottom: 5px; }
        .doc-subtitle { text-align: center; font-weight: bold; font-size: 13pt; margin-bottom: 15px; }

        /* NỘI DUNG */
        p { margin: 5px 0; text-align: justify; }
        .indent { text-indent: 1cm; }
        .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 5px; }

        /* BẢNG BIỂU */
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 12pt;
        }
        table.data-table th, table.data-table td {
            border: 1px solid black;
            padding: 5px;
            text-align: center;
            vertical-align: middle;
        }
        table.data-table th { font-weight: bold; }
        
        .align-left { text-align: left !important; padding-left: 5px; }
        
        .group-row td {
            font-weight: bold;
            text-align: left;
            padding-left: 10px;
            background-color: #ffffff;
        }

        /* PHẦN KÝ TÊN (Cập nhật giống ảnh) */
        .footer-table { width: 100%; margin-top: 20px; }
        .footer-table td { vertical-align: top; }
        
        .recipient-title { font-size: 12pt; font-weight: bold; font-style: italic; text-decoration: underline;} /* Nơi nhận */
        .recipient-list { font-size: 11pt; margin-top: 5px; line-height: 1.3; }
        .recipient-list p { margin: 2px 0 0 0; text-indent: 0; }

        .signer-header { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 5px; }
        .signer-role { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; }
        .signer-name { font-size: 13pt; font-weight: bold; text-align: center; margin-top: 100px; } /* Khoảng cách chữ ký */
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 45%;">
                <div class="org-name">TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG</div>
                <div class="org-name">TP. HỒ CHÍ MINH</div>
                <div class="dept-name">KHOA CÔNG NGHỆ THÔNG TIN</div>
                <div style="border-bottom: 1px solid black; width: 30%; margin: 2px auto;"></div>
                <div class="ref-number">Số: {{ $planNumber }}</div>
            </td>
            <td style="width: 55%;">
                <div class="nation">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div class="motto">Độc lập – Tự do – Hạnh phúc</div>
                <div class="date">Thành phố Hồ Chí Minh, ngày {{ $today->day }} tháng {{ $today->month }} năm {{ $today->year }}</div>
            </td>
        </tr>
    </table>

    <div class="doc-title">KẾ HOẠCH</div>
    <div class="doc-subtitle">Về việc tổ chức bảo vệ Khóa luận học kỳ {{ $plan->HOCKY }} năm học {{ $plan->NAMHOC }}</div>

    <p class="indent">
        Căn cứ vào tiến độ đào tạo năm học {{ $plan->NAMHOC }}, khoa Công nghệ Thông tin triển khai một số nội dung về việc tổ chức bảo vệ khóa luận học kỳ {{ $plan->HOCKY }} năm học {{ $plan->NAMHOC }} như sau:
    </p>

    <div class="section-title">1. Lịch tổ chức bảo vệ khóa luận cử nhân</div>

    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 10%;">TT</th>
                <th style="width: 25%;">Tên Hội đồng</th>
                <th style="width: 35%;">Thời gian</th>
                <th style="width: 30%;">Địa điểm</th>
            </tr>
        </thead>
        <tbody>
            @php $stt = 1; @endphp
            @foreach($groupedCouncils as $deptName => $councils)
                <tr class="group-row">
                    <td></td>
                    <td colspan="3">{{ $deptName }}</td>
                </tr>
                @foreach($councils as $hd)
                    <tr>
                        <td>{{ $stt++ }}</td>
                        <td class="align-left">{{ $hd->TEN_HOIDONG }}</td>
                        <td>
                            @if($hd->NGAY_BAOCAO && $hd->GIO_BAOCAO)
                                @php
                                    $gio = \Carbon\Carbon::parse($hd->GIO_BAOCAO);
                                    $ngay = \Carbon\Carbon::parse($hd->NGAY_BAOCAO);
                                    $gioKetThuc = $gio->copy()->addHours(3)->addMinutes(30); 
                                @endphp
                                {{ $gio->format('H\h00') }} - {{ $gioKetThuc->format('H\h30') }} ngày {{ $ngay->format('d/m/Y') }}
                            @else
                                <i>Chưa xếp lịch</i>
                            @endif
                        </td>
                        <td>{{ $hd->PHONG ? $hd->PHONG . " - 140 Lê Trọng Tấn" : "Chưa cập nhật" }}</td>
                    </tr>
                @endforeach
            @endforeach
            @if($groupedCouncils->isEmpty())
                 <tr><td colspan="4">Chưa có dữ liệu hội đồng</td></tr>
            @endif
        </tbody>
    </table>

    <div class="section-title">2. Lịch tổ chức bảo vệ khóa luận tốt nghiệp (dành cho khóa 12 trở về trước)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 10%;">TT</th>
                <th style="width: 25%;">Tên Hội đồng</th>
                <th style="width: 35%;">Thời gian</th>
                <th style="width: 30%;">Địa điểm</th>
            </tr>
        </thead>
        <tbody>
             <tr class="group-row">
                <td></td>
                <td colspan="3">Ngành ATTT, CNTT</td>
            </tr>
            <tr>
                <td>1</td>
                <td class="align-left">Hội đồng 1</td>
                <td>7h15 - 11h30 ngày 12/12/{{ \Carbon\Carbon::now()->year }}</td>
                <td>B107VPK CNTT<br>140 Lê Trọng Tấn</td>
            </tr>
        </tbody>
    </table>

    <div class="section-title">3. Phân công thực hiện</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 10%;">TT</th>
                <th style="width: 35%;">Công việc</th>
                <th style="width: 25%;">Phụ trách</th>
                <th style="width: 30%;">Thời gian hoàn thành</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td class="align-left">Mượn phòng cho Hội đồng</td>
                <td>Giáo vụ khoa</td>
                <td>Trước ngày 03/12/{{ \Carbon\Carbon::now()->year }}</td>
            </tr>
            <tr>
                <td>2</td>
                <td class="align-left">In hồ sơ, biểu mẫu</td>
                <td>Thư ký</td>
                <td>Từ ngày 08/12/{{ \Carbon\Carbon::now()->year }}</td>
            </tr>
            <tr>
                <td>3</td>
                <td class="align-left">Trả hồ sơ, biểu mẫu tại văn phòng khoa</td>
                <td>Thư ký</td>
                <td>Trước ngày 29/12/{{ \Carbon\Carbon::now()->year }}</td>
            </tr>
        </tbody>
    </table>

    <table class="footer-table">
        <tr>
            <td style="width: 55%; text-align: left; padding-left: 20px;">
                <div class="recipient-title">Nơi nhận:</div>
                <div class="recipient-list">
                    <p>- BLĐ Khoa (để b/c);</p>
                    <p>- Các thành viên trong Hội đồng;</p>
                    <p>- Các bộ môn có sinh viên bảo vệ;</p>
                    <p>- Website Khoa;</p>
                    <p>- Lưu: KCNTT.</p>
                </div>
            </td>
            <td style="width: 45%;">
                <div class="signer-header">{{ $signerHeader }}</div>
                
                @if(!empty($signerRole))
                    <div class="signer-role">{{ $signerRole }}</div>
                @endif
                
                <div class="signer-name">{{ $signerName }}</div>
            </td>
        </tr>
    </table>

</body>
</html>