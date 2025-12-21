<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Danh sách Hội đồng</title>
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
            margin: 0.5cm 0.5cm;
        }

        /* HEADER & FOOTER */
        .header-table, .footer-table { width: 100%; border: none; margin-bottom: 5px; }
        .header-table td, .footer-table td { vertical-align: top; text-align: center; }
        
        .school-name { font-size: 11pt; font-weight: normal; text-transform: uppercase; }
        .school-name-bold { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
        .nation { font-weight: bold; font-size: 11pt; text-transform: uppercase; }
        .motto { font-weight: bold; font-size: 11pt; border-bottom: 1px solid black; display: inline-block; padding-bottom: 2px; }
        
        .appendix { text-align: left; font-size: 11pt; margin: 10px 0 5px 0; font-weight: bold; }
        .doc-title { text-align: center; font-weight: bold; font-size: 13pt; margin-top: 10px; }
        .doc-subtitle { text-align: center; font-weight: bold; font-size: 13pt; text-transform: uppercase; }
        .decision-ref { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 20px; }

        /* TABLE STYLING */
        .council-header { 
            font-weight: bold; 
            text-transform: uppercase; 
            margin-top: 25px; 
            margin-bottom: 5px; 
            text-align: left;
            text-decoration: underline;
            font-size: 12pt;
        }

        table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11pt;
            margin-bottom: 10px;
            page-break-inside: auto; /* Allow table to break across pages */
        }
        
        table.data-table th, table.data-table td {
            border: 1px solid black;
            padding: 5px;
            vertical-align: middle;
        }

        table.data-table th { 
            font-weight: bold; 
            text-align: center; 
            background-color: white; 
            vertical-align: middle;
        }
        
        /* Prevent page breaks inside rows if possible, but allow for long content */
        tr { page-break-inside: avoid; page-break-after: auto; }

        /* Specific fix for rowspans causing white space: force heights if needed, or rely on content */
        /* .col-topic, .col-gv { height: 1px; } This is a trick sometimes used but risky */

        /* Column Widths */
        .col-stt { width: 5%; text-align: center; }
        .col-mssv { width: 12%; text-align: center; }
        .col-holot { width: 22%; text-align: left; border-right: none; } /* Removed right border for visual merge */
        .col-ten { width: 8%; text-align: left; border-left: none; } /* Removed left border for visual merge */
        .col-topic { width: 28%; text-align: left; } 
        .col-gv { width: 15%; text-align: left; }
        .col-note { width: 10%; text-align: center; }

        /* Footer Signature */
        .recipient-col { width: 50%; text-align: left; }
        .signature-col { width: 50%; text-align: center; }
        .recipient-title { font-weight: bold; font-style: italic; text-decoration: underline; font-size: 11pt; }
        .recipient-list p { margin: 3px 0; font-size: 11pt; }
        .signer-role { font-weight: bold; font-size: 12pt; text-transform: uppercase; margin-bottom: 80px; }
        .signer-name { font-weight: bold; font-size: 12pt; }
        
        .text-center { text-align: center; }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 45%;">
                <div class="school-name">TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG</div>
                <div class="school-name-bold">THÀNH PHỐ HỒ CHÍ MINH</div>
            </td>
            <td style="width: 55%;">
                <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
            </td>
        </tr>
    </table>

    <div class="appendix">PHỤ LỤC 2:</div>

    <div class="doc-title">DANH SÁCH SINH VIÊN BẢO VỆ KHÓA LUẬN CỬ NHÂN</div>
    <div class="doc-subtitle">NGÀNH CÔNG NGHỆ THÔNG TIN, KHOA CÔNG NGHỆ THÔNG TIN,<br>HỌC KỲ {{ $plan->HOCKY }} NĂM HỌC {{ $plan->NAMHOC }}</div>
    
    <div class="decision-ref">
        (Ban hành kèm theo Quyết định số ...../QĐ-DCT ngày ... tháng ... năm 20... <br>
        của Hiệu trưởng Trường Đại học Công Thương Thành phố Hồ Chí Minh)
    </div>

    @php $globalStt = 1; @endphp
    
    @foreach($councils as $council)
        <div class="council-header">{{ $council['ten_hoi_dong'] }}</div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th class="col-stt">STT</th>
                    <th class="col-mssv">Mã số<br>sinh viên</th>
                    <th class="col-holot" colspan="2">Họ và tên</th> 
                    {{-- Combined header for Name --}}
                    <th class="col-topic">Tên Khóa luận tốt nghiệp</th>
                    <th class="col-gv">Người hướng dẫn<br>Khóa luận tốt nghiệp</th>
                    <th class="col-note">Ghi chú</th>
                </tr>
            </thead>
            <tbody>
                @foreach($council['topics'] as $topic)
                    @php 
                        $studentCount = count($topic['sinh_viens']); 
                    @endphp

                    @foreach($topic['sinh_viens'] as $index => $sv)
                        <tr>
                            <td class="text-center">{{ $globalStt++ }}</td>
                            <td class="text-center">{{ $sv['mssv'] }}</td>
                            
                            {{-- Split name columns but make them look merged --}}
                            <td class="col-holot" style="border-right: 0;">{{ $sv['ho_lot'] }}</td>
                            <td class="col-ten" style="border-left: 0;">{{ $sv['ten'] }}</td>
                            
                            {{-- Topic, Supervisor, Note --}}
                            @if($index === 0)
                                <td class="col-topic" rowspan="{{ $studentCount }}">
                                    {{ $topic['ten_detai'] }}
                                </td>
                                <td class="col-gv" rowspan="{{ $studentCount }}">
                                    {{ $topic['gvhd'] }}
                                </td>
                                <td class="col-note" rowspan="{{ $studentCount }}">
                                    </td>
                            @endif
                        </tr>
                    @endforeach
                @endforeach
            </tbody>
        </table>
    @endforeach

    @if(empty($councils))
        <div style="text-align: center; margin-top: 20px; font-style: italic;">Chưa có dữ liệu hội đồng.</div>
    @endif

    <table class="footer-table" style="margin-top: 20px;">
        <tr>
            <td class="recipient-col" style="padding-left: 20px;">
                <div class="recipient-title">Nơi nhận:</div>
                <div class="recipient-list">
                    <p>- BLĐ Khoa (để b/c);</p>
                    <p>- Các thành viên trong Hội đồng;</p>
                    <p>- Các bộ môn có sinh viên bảo vệ;</p>
                    <p>- Website Khoa;</p>
                    <p>- Lưu: KCNTT.</p>
                </div>
            </td>
            <td class="signature-col">
                <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">KT. TRƯỞNG KHOA</div>
                <div class="signer-role">PHÓ TRƯỞNG KHOA</div>
                <div class="signer-name">{{ $signerName }}</div>
            </td>
        </tr>
    </table>

</body>
</html>