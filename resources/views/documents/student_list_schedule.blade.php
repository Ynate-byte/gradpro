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
            line-height: 1.2;
            margin: 0.5cm 0.5cm;
        }

        /* HEADER & FOOTER */
        .header-table, .footer-table { width: 100%; border: none; margin-bottom: 5px; }
        .header-table td, .footer-table td { vertical-align: top; text-align: center; }
        
        .school-name { font-size: 11pt; font-weight: normal; }
        .nation { font-weight: bold; font-size: 11pt; }
        .motto { font-weight: bold; font-size: 11pt; border-bottom: 1px solid black; display: inline-block; padding-bottom: 2px; }
        .appendix { text-align: left; font-size: 11pt; margin: 10px 0 5px 0; font-weight: bold; }
        .doc-title { text-align: center; font-weight: bold; font-size: 13pt; margin-top: 5px; }
        .doc-subtitle { text-align: center; font-weight: bold; font-size: 13pt; text-transform: uppercase; }
        .decision-ref { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 15px; }

        /* TABLE STYLING GIỐNG MẪU */
        .council-header { 
            font-weight: bold; 
            text-transform: uppercase; 
            margin-top: 20px; 
            margin-bottom: 5px; 
            text-align: left;
            text-decoration: underline;
        }

        table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11pt;
            margin-bottom: 10px;
            table-layout: fixed; /* Cố định độ rộng */
        }
        
        table.data-table th, table.data-table td {
            border: 1px solid black;
            padding: 5px 4px;
            vertical-align: middle;
            word-wrap: break-word;
        }

        table.data-table th { 
            font-weight: bold; 
            text-align: center; 
            background-color: white; 
        }

        /* ĐỘ RỘNG CỘT (Tinh chỉnh theo ảnh mẫu) */
        .col-stt { width: 5%; text-align: center; }
        .col-mssv { width: 13%; text-align: center; }
        /* Cột Họ và Tên: Gộp lại chiếm khoảng 25-27% */
        .col-holot { width: 18%; text-align: left; border-right: none; padding-right: 2px; }
        .col-ten { width: 9%; text-align: left; border-left: none; padding-left: 2px; }
        
        .col-topic { width: 30%; text-align: justify; }
        .col-gv { width: 15%; text-align: left; }
        .col-note { width: 8%; text-align: center; }

        /* Xử lý ngắt trang: Không ngắt giữa chừng 1 sinh viên */
        tr { page-break-inside: avoid; }
        
        /* Chỉnh footer */
        .recipient-col { width: 50%; text-align: left; }
        .signature-col { width: 50%; text-align: center; }
        .recipient-title { font-weight: bold; font-style: italic; text-decoration: underline; font-size: 11pt; }
        .recipient-list p { margin: 2px 0; font-size: 11pt; }
        .signer-role { font-weight: bold; font-size: 12pt; text-transform: uppercase; margin-bottom: 80px; }
        .signer-name { font-weight: bold; font-size: 12pt; }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 45%;">
                <div class="school-name">TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG</div>
                <div class="school-name" style="font-weight: bold;">THÀNH PHỐ HỒ CHÍ MINH</div>
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
                    <th rowspan="2" class="col-stt">STT</th>
                    <th rowspan="2" class="col-mssv">Mã số<br>sinh viên</th>
                    <th colspan="2" style="border-bottom: 1px solid black; padding: 0;">
                        <div style="padding: 5px;">Họ và tên</div>
                        <div style="display: flex; width: 100%; border-top: 1px solid black; display: none;"> <div style="width: 65%; border-right: 1px solid black;"></div>
                            <div style="width: 35%;"></div>
                        </div>
                    </th>
                    <th rowspan="2" class="col-topic">Tên Khóa luận tốt nghiệp</th>
                    <th rowspan="2" class="col-gv">Người hướng dẫn<br>Khóa luận tốt nghiệp</th>
                    <th rowspan="2" class="col-note">Ghi chú</th>
                </tr>
                <tr style="height: 0px;">
                    <th class="col-holot" style="height: 0px; padding: 0; border-top: none;"></th>
                    <th class="col-ten" style="height: 0px; padding: 0; border-top: none;"></th>
                </tr>
            </thead>
            <tbody>
                @foreach($council['topics'] as $topic)
                    @php 
                        $studentCount = count($topic['sinh_viens']); 
                        $firstStudent = true;
                    @endphp

                    @foreach($topic['sinh_viens'] as $index => $sv)
                        <tr>
                            <td class="col-stt">{{ $globalStt++ }}</td>
                            <td class="col-mssv">{{ $sv['mssv'] }}</td>
                            
                            <td class="col-holot" style="border-right: none;">
                                {{ $sv['ho_lot'] }}
                            </td>
                            
                            <td class="col-ten" style="border-left: none;">
                                {{ $sv['ten'] }}
                            </td>
                            
                            @if($index === 0)
                                <td class="col-topic" style="{{ $studentCount > 1 ? 'border-bottom: none;' : '' }}">
                                    {{ $topic['ten_detai'] }}
                                </td>
                                <td class="col-gv" style="{{ $studentCount > 1 ? 'border-bottom: none;' : '' }}">
                                    {{ $topic['gvhd'] }}
                                </td>
                                <td class="col-note" style="{{ $studentCount > 1 ? 'border-bottom: none;' : '' }}"></td>
                            @elseif($index === $studentCount - 1)
                                <td class="col-topic" style="border-top: none;"></td>
                                <td class="col-gv" style="border-top: none;"></td>
                                <td class="col-note" style="border-top: none;"></td>
                            @else
                                <td class="col-topic" style="border-top: none; border-bottom: none;"></td>
                                <td class="col-gv" style="border-top: none; border-bottom: none;"></td>
                                <td class="col-note" style="border-top: none; border-bottom: none;"></td>
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

    <table class="footer-table">
        <tr>
            <td class="recipient-col">
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
                <div class="signer-header">KT. TRƯỞNG KHOA</div>
                <div class="signer-role">PHÓ TRƯỞNG KHOA</div>
                <div class="signer-name" style="margin-top: 80px;">{{ $signerName }}</div>
            </td>
        </tr>
    </table>

</body>
</html>