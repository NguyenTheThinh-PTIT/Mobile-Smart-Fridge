# -*- coding: utf-8 -*-
"""
Chương 4: Công nghệ và công cụ phát triển.
"""
from .helpers import add_body, make_table


def build(doc):
    doc.add_heading("CHƯƠNG 4. CÔNG NGHỆ VÀ CÔNG CỤ PHÁT TRIỂN", level=1)

    # ── 4.1 ──────────────────────────────────
    doc.add_heading("4.1. Công nghệ frontend", level=2)

    add_body(
        doc,
        "Ứng dụng mobile được phát triển bằng React Native phiên bản 0.81.5 "
        "kết hợp TypeScript để đảm bảo type safety và giảm lỗi runtime. Lý "
        "do lựa chọn React Native là khả năng phát triển đa nền tảng (Android "
        "và iOS) từ một code base duy nhất, đồng thời vẫn đảm bảo hiệu năng "
        "gần với ứng dụng native nhờ cơ chế bridge của React Native."
    )
    add_body(
        doc,
        "Các thư viện chính được sử dụng gồm: Redux Toolkit cho state "
        "management (với redux-persist để lưu trữ trạng thái offline), React "
        "Navigation cho điều hướng (Stack Navigator và Bottom Tab Navigator), "
        "Axios cho HTTP client (với custom interceptor xử lý lỗi và retry "
        "tự động), và các thư viện giao diện như React Native Paper, React "
        "Native Vector Icons."
    )
    add_body(
        doc,
        "Cấu trúc mã nguồn frontend được tổ chức theo feature-driven "
        "structure: mỗi tính năng (auth, inventory, planner, recipes, chat, "
        "account, social) có thư mục riêng chứa screens, components và logic. "
        "Thư mục core/ chứa các base widgets, constants, theme, network "
        "client và utilities dùng chung."
    )

    # ── 4.2 ──────────────────────────────────
    doc.add_heading("4.2. Công nghệ backend", level=2)

    add_body(
        doc,
        "Backend được xây dựng trên nền tảng Spring Boot 3.1.5 với Java 17, "
        "một trong những framework phổ biến và mạnh mẽ nhất cho phát triển "
        "ứng dụng doanh nghiệp. Spring Boot được lựa chọn vì hệ sinh thái "
        "phong phú, khả năng tích hợp đa dạng và hiệu năng xử lý cao."
    )
    add_body(
        doc,
        "Các module Spring được sử dụng gồm: Spring Security cho xác thực "
        "và phân quyền (JWT + OAuth2), Spring Data JPA/Hibernate cho ORM và "
        "tương tác cơ sở dữ liệu, Spring WebSocket cho đồng bộ thời gian "
        "thực (STOMP protocol), Flyway cho database migration, MapStruct "
        "cho việc chuyển đổi giữa entity và DTO, và LangChain4j cho tích "
        "hợp Gemini AI API."
    )
    add_body(
        doc,
        "Backend được tổ chức theo kiến trúc module hóa: mỗi nhóm tính năng "
        "(auth, household, inventory, chat, recipe, planner, social, analytics) "
        "có package riêng với controller, service và repository tương ứng. "
        "Connection pool sử dụng HikariCP với tối đa 20 kết nối đồng thời."
    )

    # ── 4.3 ──────────────────────────────────
    doc.add_heading("4.3. Công nghệ AI service", level=2)

    add_body(
        doc,
        "Dịch vụ AI được xây dựng bằng FastAPI (Python), một framework web "
        "hiệu năng cao hỗ trợ async/await native. FastAPI được lựa chọn vì "
        "tốc độ xử lý nhanh (tương đương NodeJS và Go), tự động sinh tài "
        "liệu API (Swagger/OpenAPI) và hỗ trợ tốt cho các tác vụ xử lý "
        "dữ liệu và AI."
    )
    add_body(
        doc,
        "Các thành phần chính của AI service bao gồm: SQLAlchemy 2.x (async) "
        "với asyncpg driver để truy vấn PostgreSQL bất đồng bộ, Gemini API "
        "cho embedding (mô hình gemini-embedding-001, 3072 chiều) và LLM "
        "(mô hình gemini-2.5-flash) cho sinh văn bản, Redis client để cache "
        "kết quả gợi ý (2 giờ) và dữ liệu thời tiết (30 phút), và Pydantic "
        "v2 cho validation schema."
    )
    add_body(
        doc,
        "Pipeline gợi ý món ăn được thiết kế theo 6 bước: (1) Thu thập ngữ "
        "cảnh (thành viên, sở thích, kho, thời tiết); (2) Lọc cứng theo dị "
        "ứng và chế độ ăn; (3) Tìm kiếm hybrid (70% dense vector + 30% "
        "sparse trigram); (4) Chấm điểm mềm (coverage + bonus thực phẩm sắp "
        "hết hạn + bonus thời gian nấu); (5) Sinh lý do bằng LLM; (6) Cache "
        "và trả kết quả."
    )

    # ── 4.4 ──────────────────────────────────
    doc.add_heading("4.4. Cơ sở dữ liệu và vector database", level=2)

    add_body(
        doc,
        "Hệ thống sử dụng PostgreSQL 15 làm cơ sở dữ liệu quan hệ chính, "
        "kết hợp phần mở rộng pgvector để hỗ trợ tìm kiếm vector. PostgreSQL "
        "được lựa chọn vì độ ổn định cao, hỗ trợ JSON native (cho lưu trữ "
        "đặc tính như allergies, diets), và khả năng mở rộng với pgvector giúp "
        "loại bỏ nhu cầu sử dụng một vector database riêng biệt (như Pinecone "
        "hay ChromaDB), giảm độ phức tạp vận hành."
    )
    add_body(
        doc,
        "Vector embedding được lưu trữ trong bảng recipe_embeddings với kiểu "
        "dữ liệu VECTOR(3072). Mỗi công thức được chia thành hai chunk: "
        "\"overview\" (tên + hướng dẫn) và \"ingredients\" (danh sách nguyên "
        "liệu). Việc sử dụng pgvector cho phép thực hiện cosine similarity "
        "search trực tiếp trong PostgreSQL mà không cần dịch vụ ngoài."
    )
    add_body(
        doc,
        "Redis 7 được sử dụng làm bộ nhớ đệm (cache) để giảm tải cho API "
        "bên ngoài và tăng tốc độ phản hồi. Hai loại dữ liệu được cache: "
        "kết quả gợi ý món ăn (key theo household_id và meal_type, TTL "
        "2 giờ) và dữ liệu thời tiết (key theo tọa độ, TTL 30 phút)."
    )

    # ── 4.5 ──────────────────────────────────
    doc.add_heading("4.5. Thư viện và API bên ngoài", level=2)

    make_table(doc, ["API / Thư viện", "Mục đích sử dụng", "Nhà cung cấp"], [
        ["Gemini API",
         "Embedding (3072D) và LLM sinh văn bản", "Google AI"],
        ["Google Vision API",
         "Nhận diện thực phẩm từ hình ảnh, OCR hóa đơn", "Google Cloud"],
        ["OpenWeather API",
         "Lấy dữ liệu thời tiết theo tọa độ", "OpenWeather"],
        ["Firebase Cloud Messaging",
         "Gửi thông báo đẩy đến thiết bị di động", "Firebase/Google"],
        ["Google OAuth2",
         "Xác thực đăng nhập bằng tài khoản Google", "Google"],
    ])

    # ── 4.6 ──────────────────────────────────
    doc.add_heading("4.6. Công cụ phát triển, quản lý mã nguồn, test, thiết kế UI", level=2)

    make_table(doc, ["Công cụ", "Mục đích"], [
        ["VS Code / IntelliJ IDEA",
         "IDE chính cho phát triển frontend và backend"],
        ["Git / GitHub",
         "Quản lý phiên bản mã nguồn, cộng tác nhóm\n"
         "(repo: github.com/phucmouse135/mobile.git)"],
        ["Docker / Docker Compose",
         "Containerization và orchestration 4 dịch vụ\n"
         "(PostgreSQL, Backend, AI Service, Redis)"],
        ["Postman",
         "Test và debug API endpoints"],
        ["Android Studio / Xcode",
         "Chạy emulator và build ứng dụng mobile"],
        ["Expo CLI",
         "Hỗ trợ phát triển và build React Native"],
        ["Flyway",
         "Quản lý database migration (21+ file migration)"],
        ["pgAdmin",
         "Quản lý và truy vấn cơ sở dữ liệu PostgreSQL"],
        ["Figma",
         "Thiết kế giao diện người dùng (UI/UX mockup)"],
    ])

    doc.add_page_break()
