# -*- coding: utf-8 -*-
"""
Chương 3: Phân tích và thiết kế hệ thống (chương trọng tâm).
"""
from .helpers import add_centered, add_body, make_table


def build(doc):
    doc.add_heading("CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG", level=1)

    _section_31(doc)
    _section_32(doc)
    _section_33(doc)
    _section_34(doc)
    _section_35(doc)
    _section_36(doc)
    _section_37(doc)

    doc.add_page_break()


# ── 3.1 ──────────────────────────────────────
def _section_31(doc):
    doc.add_heading("3.1. Kiến trúc tổng quan", level=2)

    add_body(
        doc,
        "Hệ thống SmartFridge AI được thiết kế theo kiến trúc microservice gồm "
        "ba thành phần chính giao tiếp với nhau qua mạng nội bộ: ứng dụng di "
        "động (Mobile Client), máy chủ backend (Spring Boot API), và dịch vụ AI "
        "(FastAPI AI Service). Ngoài ra, hệ thống sử dụng PostgreSQL làm cơ sở "
        "dữ liệu quan hệ chính, Redis làm bộ nhớ đệm (cache) và Firebase Cloud "
        "Messaging cho thông báo đẩy."
    )
    add_body(
        doc,
        "Mô hình giao tiếp giữa các thành phần như sau: Mobile Client giao tiếp "
        "với Backend qua REST API (HTTP/HTTPS) cho các thao tác CRUD thông "
        "thường, và qua WebSocket/STOMP cho đồng bộ thời gian thực. Backend "
        "giao tiếp với AI Service qua REST API nội bộ. AI Service truy vấn "
        "PostgreSQL (với pgvector) để thực hiện tìm kiếm vector và sử dụng "
        "Redis để cache kết quả gợi ý và dữ liệu thời tiết."
    )

    add_centered(doc,
                 "[Hình 3.1. Kiến trúc tổng quan hệ thống SmartFridge AI]",
                 size=12, bold=True)

    add_body(doc, "Chi tiết luồng giao tiếp:")
    add_body(
        doc,
        "(1) Mobile Client gửi request HTTP kèm JWT token đến Backend (port 8080). "
        "Backend xác thực token, xử lý logic nghiệp vụ và trả về response theo "
        "định dạng envelope chuẩn {success, data, error}."
    )
    add_body(
        doc,
        "(2) Khi dữ liệu kho thực phẩm thay đổi, Backend phát (broadcast) sự "
        "kiện qua WebSocket/STOMP broker. Tất cả thiết bị đang subscribe vào "
        "topic của Household tương ứng sẽ nhận được cập nhật ngay lập tức."
    )
    add_body(
        doc,
        "(3) Khi người dùng yêu cầu gợi ý món ăn, Backend chuyển tiếp request đến "
        "AI Service (port 8001). AI Service thực hiện pipeline gồm: thu thập ngữ "
        "cảnh, lọc cứng (hard filter), tìm kiếm hybrid (dense + sparse), chấm "
        "điểm mềm (soft scoring), và sinh lý do bằng LLM."
    )
    add_body(
        doc,
        "(4) AI Service sử dụng Redis (port 6379) để cache kết quả gợi ý "
        "(TTL 2 giờ) và dữ liệu thời tiết (TTL 30 phút), giúp giảm tải cho "
        "API bên ngoài và tăng tốc độ phản hồi."
    )


# ── 3.2 ──────────────────────────────────────
def _section_32(doc):
    doc.add_heading("3.2. Thiết kế tổng quan ứng dụng", level=2)

    add_body(
        doc,
        "Ứng dụng được thiết kế theo kiến trúc nhiều lớp (multi-layer "
        "architecture) ở cả phía client lẫn server:"
    )

    add_body(doc, "Phía Mobile Client (React Native):", bold=True)
    add_body(
        doc,
        "Lớp Presentation (UI): Các màn hình (Screen) và component React "
        "Native, tổ chức theo feature-driven structure (auth, inventory, home, "
        "planner, recipes, chat, account, social). Sử dụng React Navigation "
        "với Stack và Bottom Tab Navigator."
    )
    add_body(
        doc,
        "Lớp State Management: Redux Toolkit với các slice (authSlice, "
        "householdSlice) và async thunks. Dữ liệu được persist qua "
        "redux-persist để hỗ trợ offline."
    )
    add_body(
        doc,
        "Lớp Network: AxiosClient singleton xử lý tất cả HTTP request, "
        "tự động inject Authorization header, xử lý lỗi theo exception "
        "hierarchy (NetworkException, TimeoutException, ServerException, "
        "UnauthorizedException, ValidationException, BusinessException), "
        "và hỗ trợ auto-retry cho lỗi 5xx và timeout."
    )

    add_body(doc, "Phía Backend (Spring Boot):", bold=True)
    add_body(
        doc,
        "Lớp Controller: Nhận request từ client, validate input và trả về "
        "response. Các controller chính gồm AuthController, "
        "HouseholdController, InventoryController, ChatController, "
        "RecipeController, PlannerController."
    )
    add_body(
        doc,
        "Lớp Service: Chứa logic nghiệp vụ chính. Mỗi module có service "
        "riêng xử lý business logic."
    )
    add_body(
        doc,
        "Lớp Repository: Sử dụng Spring Data JPA/Hibernate để tương tác với "
        "PostgreSQL. Flyway quản lý migration (21+ migrations)."
    )
    add_body(
        doc,
        "Lớp Security: Spring Security kết hợp JWT (access token 30 phút, "
        "refresh token 30 ngày) và Google OAuth2 integration."
    )

    add_body(doc, "Phía AI Service (FastAPI):", bold=True)
    add_body(
        doc,
        "Sử dụng Dependency Injection của FastAPI (Depends()) để quản lý "
        "kết nối database (SQLAlchemy async), Redis client và các service. "
        "Pipeline gợi ý được thiết kế theo Strategy Pattern với Dense và "
        "Sparse retrieval."
    )

    add_centered(doc,
                 "[Hình 3.2. Kiến trúc nhiều lớp (multi-layer architecture)]",
                 size=12, bold=True)


# ── 3.3 ──────────────────────────────────────
def _section_33(doc):
    doc.add_heading(
        "3.3. Phân tích thiết kế chi tiết mức cá nhân của Nguyễn Đình Phúc",
        level=2,
    )
    add_body(
        doc,
        "Phần này trình bày chi tiết phân tích và thiết kế các module thuộc "
        "phạm vi phụ trách của Nguyễn Đình Phúc, bao gồm: Authentication & "
        "Authorization, Household Management, Inventory Management Core "
        "(FIFO), Real-time Synchronization và Profile CRUD. Đây là các module "
        "nền tảng của hệ thống, đóng vai trò \"hạt nhân\" (Core & Sync) mà "
        "các module khác đều phụ thuộc vào.",
        bold=True,
    )

    # 3.3.1
    doc.add_heading("3.3.1. Authentication & Authorization", level=3)
    add_body(
        doc,
        "Module xác thực và phân quyền là tầng bảo mật đầu tiên của toàn bộ "
        "hệ thống. Nguyễn Đình Phúc thiết kế và triển khai đầy đủ hai luồng "
        "xác thực chính: đăng nhập bằng email/mật khẩu và đăng nhập bằng "
        "Google OAuth2."
    )
    add_body(
        doc,
        "Luồng đăng nhập email/mật khẩu: Người dùng gửi request POST /auth/login "
        "với email và mật khẩu. Backend sử dụng Spring Security để xác thực thông "
        "tin, so sánh mật khẩu với hash bcrypt trong cơ sở dữ liệu. Nếu thành "
        "công, hệ thống tạo cặp JWT gồm access token (hết hạn sau 30 phút) và "
        "refresh token (hết hạn sau 30 ngày). Client lưu trữ token trong Redux "
        "store (persist bằng redux-persist) và gửi kèm trong Authorization header "
        "cho mọi request tiếp theo."
    )
    add_body(
        doc,
        "Luồng đăng nhập Google OAuth2: Người dùng chọn \"Đăng nhập bằng Google\" "
        "trên màn hình Login. Ứng dụng mobile sử dụng thư viện Google Sign-In để "
        "lấy ID token từ Google. Token này được gửi lên Backend, Backend xác thực "
        "với Google và kiểm tra xem email đã tồn tại trong hệ thống chưa. Nếu "
        "chưa, hệ thống tự động tạo tài khoản mới. Sau đó, hệ thống tạo JWT "
        "tương tự luồng đăng nhập thường."
    )
    add_body(
        doc,
        "Phân quyền: Hệ thống sử dụng mô hình phân quyền ba cấp: Owner (chủ "
        "nhà, có toàn quyền), Admin (quản trị viên, có quyền mời và xóa thành "
        "viên) và Member (thành viên thường, chỉ có quyền xem và cập nhật kho). "
        "Quyền được lưu trong bảng household_member với trường role_id. Mỗi API "
        "endpoint nhằm vào thao tác quản lý Household đều kiểm tra quyền của "
        "người dùng trước khi thực hiện."
    )

    add_centered(doc,
                 "[Hình 3.3. Luồng xác thực JWT và Google OAuth2]",
                 size=12, bold=True)

    # 3.3.2
    doc.add_heading("3.3.2. Household Management", level=3)
    add_body(
        doc,
        "Household (\"nhà\") là đơn vị tổ chức trung tâm của hệ thống "
        "SmartFridge AI. Mỗi Household có một kho thực phẩm chung (Inventory), "
        "danh sách thành viên và các kế hoạch bữa ăn riêng. Nguyễn Đình Phúc "
        "thiết kế module này với các chức năng sau:"
    )
    add_body(
        doc,
        "Tạo Household: Khi người dùng chọn tạo nhà mới, hệ thống tạo bản ghi "
        "trong bảng household, gán người dùng làm Owner trong bảng "
        "household_member, tự động tạo Inventory rỗng cho nhà và sinh mã mời "
        "6 ký tự (lưu trong bảng household_invite với thời hạn 14–30 ngày). "
        "Đồng thời, hệ thống tạo mã QR chứa liên kết trực tiếp đến trang "
        "tham gia Household."
    )
    add_body(
        doc,
        "Mời thành viên qua QR: Người muốn tham gia quét mã QR bằng camera "
        "điện thoại (sử dụng thư viện react-native-camera). Ứng dụng phân "
        "tích QR, trích xuất mã mời 6 ký tự và gửi request POST "
        "/household/invite/accept lên Backend. Backend kiểm tra mã còn hiệu "
        "lực (chưa hết hạn, chưa bị vô hiệu) rồi thêm người dùng vào bảng "
        "household_member với role Member."
    )
    add_body(
        doc,
        "Quản lý thành viên: Owner có thể chuyển quyền sở hữu (transfer "
        "ownership), xóa thành viên khỏi nhà. Admin có thể mời và xóa thành "
        "viên. Member có thể rời khỏi nhà (leave). Khi tái tạo mã mời "
        "(regenerate invite), mã cũ bị vô hiệu và mã mới được sinh ra."
    )

    add_centered(doc,
                 "[Hình 3.4. Sơ đồ hoạt động quản lý Household]",
                 size=12, bold=True)

    # 3.3.3
    doc.add_heading("3.3.3. Inventory Management Core", level=3)
    add_body(
        doc,
        "Module quản lý kho thực phẩm là chức năng cốt lõi của SmartFridge AI. "
        "Kho thực phẩm của mỗi Household được tổ chức theo cấu trúc hai cấp: "
        "Inventory (đại diện cho toàn bộ kho của một nhà) và Inventory Batch "
        "(đại diện cho từng lô nhập của một loại thực phẩm)."
    )
    add_body(
        doc,
        "Mỗi khi thêm thực phẩm, hệ thống tạo một bản ghi inventory_batch mới "
        "gồm các thông tin: food_id (liên kết đến bảng food), quantity (số lượng), "
        "unit (đơn vị), entry_date (ngày nhập), expiration_date (hạn sử dụng), "
        "status (trạng thái: còn/hết/sắp hết) và storage_section (vị trí lưu trữ "
        "trong tủ lạnh). Một loại thực phẩm có thể có nhiều batch với hạn sử dụng "
        "khác nhau — đây là nền tảng cho thuật toán FIFO."
    )
    add_body(
        doc,
        "Các thao tác CRUD cơ bản bao gồm: xem danh sách tất cả thực phẩm trong "
        "kho theo Household, thêm thực phẩm mới (tạo batch), cập nhật số lượng "
        "hoặc thông tin batch, và xóa batch. Mọi thay đổi đều được đồng bộ qua "
        "WebSocket đến các thiết bị khác."
    )

    # 3.3.4
    doc.add_heading("3.3.4. FIFO Logic", level=3)
    add_body(
        doc,
        "Thuật toán FIFO (First In First Out — Nhập trước xuất trước) được áp "
        "dụng khi người dùng sử dụng hoặc trừ bớt thực phẩm từ kho. Mục đích "
        "là đảm bảo các lô thực phẩm nhập trước (có hạn sử dụng gần hơn) được "
        "sử dụng trước, giảm thiểu rủi ro thực phẩm hết hạn bị bỏ quên."
    )
    add_body(
        doc,
        "Quy trình xử lý FIFO khi trừ kho: Khi người dùng sử dụng một lượng "
        "thực phẩm (ví dụ: 3 quả trứng), hệ thống truy vấn tất cả các batch "
        "của loại thực phẩm đó trong Inventory, sắp xếp theo entry_date tăng "
        "dần (batch cũ nhất lên đầu). Sau đó, hệ thống trừ lần lượt từ batch "
        "cũ nhất: nếu batch đầu tiên đủ số lượng thì trừ và cập nhật; nếu "
        "không đủ thì trừ hết batch đó (đánh dấu status là hết) và tiếp tục "
        "trừ ở batch tiếp theo cho đến khi đủ số lượng cần thiết."
    )
    add_body(
        doc,
        "Ví dụ minh họa: Giả sử trong kho có 3 batch trứng gà: Batch A (nhập "
        "01/04, còn 2 quả, hạn 10/04), Batch B (nhập 05/04, còn 5 quả, hạn "
        "15/04), Batch C (nhập 08/04, còn 3 quả, hạn 20/04). Người dùng sử "
        "dụng 4 quả trứng. Hệ thống sẽ: trừ hết 2 quả của Batch A (hết, đánh "
        "dấu status = depleted), rồi trừ tiếp 2 quả của Batch B (còn lại 3 quả). "
        "Kết quả: Batch A hết, Batch B còn 3, Batch C còn 3."
    )

    add_centered(doc,
                 "[Hình 3.5. Luồng xử lý FIFO trong quản lý kho thực phẩm]",
                 size=12, bold=True)

    # 3.3.5
    doc.add_heading("3.3.5. Real-time Synchronization", level=3)
    add_body(
        doc,
        "Đồng bộ thời gian thực là một trong những tính năng quan trọng nhất "
        "của SmartFridge AI, đảm bảo tất cả thành viên trong cùng Household "
        "luôn thấy trạng thái kho thực phẩm mới nhất. Nguyễn Đình Phúc sử "
        "dụng giao thức WebSocket với STOMP (Simple Text Oriented Messaging "
        "Protocol) để triển khai tính năng này."
    )
    add_body(
        doc,
        "Kiến trúc đồng bộ hoạt động như sau: Khi ứng dụng mobile khởi động "
        "và người dùng đã đăng nhập, client thiết lập kết nối WebSocket đến "
        "Backend và subscribe vào topic /topic/household/{householdId}. Mỗi "
        "khi có bất kỳ thay đổi nào về kho thực phẩm (thêm, sửa, xóa, trừ "
        "kho), Backend phát (broadcast) sự kiện cập nhật qua STOMP broker đến "
        "tất cả subscriber của topic tương ứng."
    )
    add_body(
        doc,
        "Kịch bản minh họa: Giả sử gia đình A có 3 thành viên, mỗi người sử "
        "dụng một điện thoại riêng. Thành viên A thêm 1kg thịt bò vào kho. "
        "Backend lưu dữ liệu vào PostgreSQL, trả về response cho thiết bị A, "
        "đồng thời phát sự kiện WebSocket. Thiết bị B và C nhận được sự kiện "
        "này và tự động cập nhật giao diện — tất cả diễn ra trong vòng dưới "
        "1 giây."
    )
    add_body(
        doc,
        "Xử lý tình huống đặc biệt: Khi thiết bị mất kết nối (mất mạng, "
        "thoát ứng dụng), kết nối WebSocket bị đóng. Khi kết nối lại, client "
        "tự động re-subscribe và gửi request lấy dữ liệu mới nhất từ Backend "
        "để đồng bộ trạng thái. Cơ chế này đảm bảo dữ liệu luôn nhất quán "
        "ngay cả khi có gián đoạn mạng."
    )

    add_centered(doc,
                 "[Hình 3.6. Kiến trúc đồng bộ thời gian thực bằng WebSocket/STOMP]",
                 size=12, bold=True)

    # 3.3.6
    doc.add_heading("3.3.6. Profile CRUD", level=3)
    add_body(
        doc,
        "Module quản lý hồ sơ cá nhân cho phép người dùng xem và cập nhật "
        "thông tin của mình trong hệ thống. Các thông tin được quản lý bao "
        "gồm: họ tên (fullname), email, ảnh đại diện (avatar), và các thiết "
        "lập cá nhân như sở thích ăn uống, dị ứng thực phẩm và chế độ ăn "
        "(được lưu trong bảng user_preference dưới dạng JSON). Giao diện cập "
        "nhật profile được đặt trong AccountStack của ứng dụng mobile, cho "
        "phép người dùng thay đổi thông tin bất kỳ lúc nào."
    )

    # 3.3.7
    doc.add_heading("3.3.7. UI flow các màn hình phần cá nhân", level=3)
    add_body(doc, "Các màn hình chính thuộc phạm vi của Nguyễn Đình Phúc bao gồm:")

    add_body(
        doc,
        "Màn hình Splash/Login: Là màn hình đầu tiên khi mở ứng dụng. Nếu "
        "người dùng đã đăng nhập trước đó (token còn hiệu lực), ứng dụng tự "
        "động chuyển sang Home. Nếu chưa, hiển thị màn hình Login với hai lựa "
        "chọn: nhập email/mật khẩu hoặc đăng nhập bằng Google. Sau khi xác "
        "thực thành công, hiển thị màn hình Home với thông tin user và Household."
    )
    add_body(
        doc,
        "Màn hình Inventory: Hiển thị danh sách tất cả thực phẩm trong kho "
        "của Household hiện tại. Mỗi item hiển thị tên thực phẩm, số lượng, "
        "đơn vị, hạn sử dụng và trạng thái (còn, sắp hết, hết). Có nút thêm "
        "mới (FAB — Floating Action Button) và chức năng sửa/xóa trên từng "
        "item. Dữ liệu được cập nhật realtime qua WebSocket."
    )
    add_body(
        doc,
        "Màn hình Quản lý thành viên: Hiển thị danh sách các thành viên trong "
        "Household với tên, email, vai trò (Owner/Admin/Member) và thời gian "
        "tham gia. Owner/Admin có các tùy chọn quản lý: thay đổi vai trò, xóa "
        "thành viên, chuyển quyền sở hữu."
    )
    add_body(
        doc,
        "Màn hình QR invitation: Hiển thị mã QR của Household để chia sẻ với "
        "người muốn tham gia. Có nút \"Tái tạo mã\" để sinh mã mới (vô hiệu "
        "mã cũ). Đồng thời có chức năng nhập mã mời thủ công (6 ký tự) cho "
        "trường hợp không quét được QR. Màn hình JoinHousehold có giao diện "
        "camera với khung quét và hiệu ứng scan line động."
    )


# ── 3.4 ──────────────────────────────────────
def _section_34(doc):
    doc.add_heading("3.4. Biểu đồ lớp", level=2)

    add_body(
        doc,
        "Hệ thống SmartFridge AI sử dụng các lớp (class/entity) chính sau "
        "đây. Bảng 3.1 mô tả các lớp và thuộc tính quan trọng:"
    )

    make_table(doc, ["Lớp", "Thuộc tính chính", "Mô tả"], [
        ["User",
         "id, email, fullname, password_hash, profile_id, created_at",
         "Thực thể người dùng"],
        ["UserPreference",
         "user_id, allergies (JSON), diets (JSON),\ntastes (JSON), cooking_skill_level",
         "Sở thích và thiết lập dinh dưỡng"],
        ["Household",
         "id, name, created_at",
         "Đơn vị gia đình/nhà"],
        ["HouseholdMember",
         "user_id, household_id, role_id",
         "Quan hệ thành viên – nhà và vai trò"],
        ["HouseholdInvite",
         "code (6 ký tự), household_id,\nexpires_at, is_active",
         "Mã mời tham gia nhà"],
        ["Inventory",
         "id, household_id",
         "Kho thực phẩm của mỗi nhà"],
        ["InventoryBatch",
         "id, inventory_id, food_id, quantity, unit,\nentry_date, expiration_date, status,\nstorage_section",
         "Lô nhập thực phẩm cụ thể"],
        ["Food",
         "id, name, default_shelf_life_day, category_id",
         "Danh mục thực phẩm"],
        ["Recipe",
         "id, name, instructions, cook_time_minutes,\ndifficulty, cuisine_type,\nallergen_contains (JSON), source,\ncreated_by, household_id",
         "Công thức nấu ăn"],
        ["RecipeEmbedding",
         "recipe_id, chunk_type, chunk_content,\nembedding (VECTOR 3072)",
         "Vector embedding cho RAG"],
        ["RecipeFood",
         "recipe_id, food_id, require_quantity, unit",
         "Nguyên liệu cần cho công thức"],
        ["Meal",
         "id, household_id, meal_type,\nschedule_date, schedule_time, status",
         "Bữa ăn trong kế hoạch"],
        ["MealAttendance",
         "meal_id, user_id, status, is_guest",
         "Điểm danh thành viên cho bữa ăn"],
        ["ChatSession",
         "id, member_id, title,\ncontext_tags, created_at",
         "Phiên hội thoại với chatbot"],
        ["ChatMessage",
         "session_id, sender_type, content, timestamp",
         "Tin nhắn trong phiên chat"],
    ])

    add_centered(doc,
                 "[Hình 3.7. Biểu đồ lớp các thực thể chính]",
                 size=12, bold=True)
    add_body(
        doc,
        "Ghi chú: Biểu đồ lớp đầy đủ có thể được tạo từ các entity class "
        "trong mã nguồn backend (package com.smartfridge.models) sử dụng "
        "công cụ như IntelliJ UML hoặc PlantUML.",
        italic=True,
    )


# ── 3.5 ──────────────────────────────────────
def _section_35(doc):
    doc.add_heading("3.5. Biểu đồ tuần tự", level=2)

    add_body(
        doc,
        "Các biểu đồ tuần tự sau mô tả luồng xử lý của những kịch bản quan "
        "trọng nhất trong phần của Nguyễn Đình Phúc:"
    )

    add_body(doc, "Biểu đồ tuần tự — Đăng nhập (Hình 3.8):", bold=True)
    add_body(
        doc,
        "Người dùng → LoginScreen: Nhập email/mật khẩu → AxiosClient: POST "
        "/auth/login → Backend AuthController: validateCredentials() → "
        "AuthService: authenticate() → UserRepository: findByEmail() → "
        "AuthService: generateJWT() → Client: lưu token vào Redux → "
        "RootNavigator: chuyển sang AppTab."
    )

    add_body(doc, "Biểu đồ tuần tự — Tạo Household (Hình 3.9):", bold=True)
    add_body(
        doc,
        "Người dùng → AccountScreen: chọn Tạo nhà mới → AxiosClient: POST "
        "/household → HouseholdController → HouseholdService: createHousehold() "
        "→ HouseholdRepository: save() → HouseholdMemberRepository: save(owner) "
        "→ HouseholdInviteRepository: save(code) → InventoryRepository: "
        "save(empty) → Client: cập nhật householdSlice → Navigation: chuyển "
        "sang HouseholdOverview."
    )

    add_body(doc, "Biểu đồ tuần tự — Quét QR tham gia Household (Hình 3.10):", bold=True)
    add_body(
        doc,
        "Người dùng → JoinHouseholdScreen: mở camera → Camera: quét QR → "
        "Ứng dụng: trích xuất mã 6 ký tự → AxiosClient: POST "
        "/household/invite/accept → HouseholdController → HouseholdService: "
        "validateInvite() → HouseholdMemberRepository: save(member) → "
        "WebSocket: broadcast memberJoined event → Client: cập nhật "
        "householdSlice → Navigation: chuyển sang HouseholdManagement."
    )

    add_body(doc, "Biểu đồ tuần tự — Cập nhật kho và đồng bộ realtime (Hình 3.11):", bold=True)
    add_body(
        doc,
        "Người dùng A → InventoryScreen: thêm thực phẩm → AxiosClient: POST "
        "/inventory → InventoryController → InventoryService: addBatch() → "
        "InventoryBatchRepository: save() → WebSocket STOMP Broker: publish "
        "/topic/household/{id} → Thiết bị B, C: nhận sự kiện → Redux: cập "
        "nhật inventorySlice → UI: render lại danh sách."
    )

    add_centered(doc,
                 "[Hình 3.8 – 3.11. Biểu đồ tuần tự các luồng nghiệp vụ chính]",
                 size=12, bold=True)


# ── 3.6 ──────────────────────────────────────
def _section_36(doc):
    doc.add_heading("3.6. Sơ đồ ERD", level=2)

    add_body(
        doc,
        "Sơ đồ thực thể – quan hệ (ERD) của hệ thống SmartFridge AI bao gồm "
        "15+ bảng chính được quản lý bởi PostgreSQL thông qua Flyway migration "
        "(21+ file migration). Các bảng được thiết kế theo nguyên tắc chuẩn hóa "
        "(normalization) và đảm bảo tính toàn vẹn dữ liệu thông qua các ràng "
        "buộc khóa ngoại (foreign key)."
    )
    add_body(doc, "Các mối quan hệ chính:")

    rels = [
        "user (1) ─── (N) household_member: một người dùng có thể tham gia nhiều Household",
        "household (1) ─── (N) household_member: một Household có nhiều thành viên",
        "household (1) ─── (1) inventory: mỗi Household có duy nhất một kho",
        "inventory (1) ─── (N) inventory_batch: một kho có nhiều lô thực phẩm",
        "food (1) ─── (N) inventory_batch: một loại thực phẩm có thể có nhiều lô nhập khác nhau",
        "recipe (1) ─── (N) recipe_food: một công thức có nhiều nguyên liệu",
        "recipe (1) ─── (N) recipe_embeddings: một công thức có nhiều chunk embedding",
        "household (1) ─── (N) meal: một nhà có nhiều bữa ăn",
        "meal (1) ─── (N) meal_attendance: một bữa ăn có nhiều người tham gia",
        "household_member (1) ─── (N) chat_session: một thành viên có nhiều phiên chat",
        "chat_session (1) ─── (N) chat_message: một phiên có nhiều tin nhắn",
        "household (1) ─── (N) household_invite: một nhà có nhiều mã mời (chỉ 1 active)",
    ]
    for r in rels:
        add_body(doc, f"• {r}")

    add_centered(doc,
                 "[Hình 3.12. Sơ đồ ERD cơ sở dữ liệu SmartFridge AI]",
                 size=12, bold=True)


# ── 3.7 ──────────────────────────────────────
def _section_37(doc):
    doc.add_heading("3.7. Thiết kế giao diện", level=2)

    add_body(
        doc,
        "Giao diện ứng dụng SmartFridge AI được thiết kế theo phong cách "
        "Material Design, sử dụng hệ màu xanh lam làm chủ đạo, font chữ "
        "rõ ràng và bố cục thân thiện với người dùng Việt Nam. Ứng dụng sử "
        "dụng React Navigation với Bottom Tab (5 tab chính: Home, Inventory, "
        "Planner, Recipes, Account) và Stack Navigator cho các màn hình con."
    )
    add_body(
        doc,
        "Màn hình Login (Hình 3.13): Giao diện tối giản với logo ứng dụng ở "
        "giữa, hai trường nhập email và mật khẩu, nút \"Đăng nhập\" nổi bật "
        "và nút \"Đăng nhập bằng Google\" phía dưới. Thiết kế theo xu hướng "
        "minimal, tập trung vào trải nghiệm người dùng nhanh gọn."
    )
    add_body(
        doc,
        "Màn hình Inventory (Hình 3.14): Hiển thị danh sách thực phẩm theo "
        "dạng list có icon loại thực phẩm, tên, số lượng, đơn vị và tag "
        "trạng thái (còn/sắp hết/hết). Ở góc dưới có Floating Action Button "
        "(FAB) để thêm thực phẩm mới. Hỗ trợ vuốt để xóa (swipe to delete). "
        "Có thanh tìm kiếm ở đầu trang."
    )
    add_body(
        doc,
        "Màn hình Quản lý thành viên và QR (Hình 3.15): Phần trên hiển thị "
        "mã QR lớn ở giữa để chia sẻ. Phía dưới là danh sách thành viên với "
        "avatar, tên, vai trò và các nút hành động (đổi vai trò, xóa). Có "
        "nút \"Tái tạo mã mới\" và trường nhập mã thủ công."
    )

    add_centered(doc,
                 "[Hình 3.13 – 3.15. Thiết kế giao diện các màn hình chính]",
                 size=12, bold=True)
