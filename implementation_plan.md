# Implementation Plan

[Overview]  
Đồng bộ API backend phần auth và home vào mobile-app để UI dùng dữ liệu thật, đồng thời chuẩn hóa error handling tránh crash và hiển thị đúng thông điệp lỗi.

Phạm vi triển khai tập trung vào luồng xác thực và dữ liệu trang chủ. Ở phía backend, các endpoint đã sẵn có trong `AuthController`, `CurrentUserController`, `HouseholdController` và đều trả về `ApiEnvelope`. Ở phía mobile-app, tầng network đã có `AxiosClient`, tầng error đã có `ExceptionHandler`, và auth/home UI đã tồn tại nhưng còn điểm chưa chặt chẽ (đặc biệt unwrap envelope lỗi, hardcode dữ liệu Home).

Mục tiêu là bảo đảm toàn bộ luồng từ request → envelope parsing → exception mapping → UI message hoạt động nhất quán với contract backend (đặc biệt 401 `HTTP_401` + `Invalid email or password`), đồng thời đưa dữ liệu user + household overview lên HomeScreen thay vì hardcode.

[Types]  
Sẽ chuẩn hóa kiểu dữ liệu envelope + DTO dùng chung giữa auth và home để giảm lỗi runtime.

1. Envelope & error payload (mobile-app):
- `ApiErrorEnvelope`
  - `code?: string`
  - `message?: string`
  - `details?: unknown`
- `ApiEnvelope<T>`
  - `success: boolean`
  - `data?: T`
  - `error?: ApiErrorEnvelope`

2. Auth DTO (đồng bộ với backend):
- `LoginRequest`: `{ email: string; password: string }`
- `LoginResponse`: `{ token: string; refreshToken?: string; user: { id: string; email: string; name: string } }`
- `GoogleLoginRequest`: `{ idToken: string }`
- `ForgotPasswordRequest`, `ForgotPasswordResponse`
- `VerifyOtpRequest`, `VerifyOtpResponse`
- `ResetPasswordRequest`, `MessageResponse`

3. Home/Household DTO:
- Dùng `HouseholdOverviewResponse` từ `features/account/api.ts`
  - `household`, `members`, `currentUserId`, `invite`
- View model nhẹ trong HomeScreen:
  - greetingName (ưu tiên `auth.user.name`, fallback từ email)
  - householdName, memberCount, inviteCode (nếu có)

4. Validation rules:
- Login success bắt buộc có `token`.
- Envelope `success=false` phải đi vào nhánh lỗi (không unwrap `data`).
- 401 ưu tiên đọc `error.code`/`error.message` từ backend envelope.

[Files]  
Triển khai trên các file mobile-app liên quan trực tiếp tầng network/error/auth/home.

1. File sẽ sửa:
- `mobile-app/src/core/network/AxiosClient.ts`
  - Cập nhật `unwrapApiEnvelope` để throw khi `success=false`.
  - Tạo lỗi theo shape tương thích AxiosError-like cho `ExceptionHandler`.
- `mobile-app/src/core/error/ExceptionHandler.ts`
  - Củng cố trích xuất `error.code` + `error.message` từ envelope.
- `mobile-app/src/features/auth/api.ts`
  - Rà endpoint mapping theo backend và giữ throw qua `ExceptionHandler`.
- `mobile-app/src/features/auth/LoginScreen.tsx`
  - Duy trì token guard, đảm bảo message lỗi backend hiển thị đúng.
- `mobile-app/src/features/home/HomeScreen.tsx`
  - Bỏ hardcode user, tích hợp gọi dữ liệu thật từ auth store + household API.
  - Thêm loading/error/retry cho dữ liệu home.
- `mobile-app/src/store/authSlice.ts`
  - Rà selector nếu cần để HomeScreen lấy user dễ hơn.
- `mobile-app/.env.example`
  - Làm rõ cấu hình `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` và `EXPO_PUBLIC_API_URL`.
- `TODO.md`
  - Cập nhật tiến độ theo task mới.

2. File có thể thêm mới (nếu cần tách rõ):
- `mobile-app/src/features/home/api.ts` (wrapper cho home-specific fetch)
- `mobile-app/src/features/home/types.ts` (view-model riêng)

[Functions]  
Trọng tâm cập nhật các hàm parse/mapping và lifecycle data-load ở UI.

1. Modified functions:
- `AxiosClient.unwrapApiEnvelope<T>(payload: unknown): T`
  - Nếu envelope success=true -> return data.
  - Nếu envelope success=false -> throw object chứa `response.data=payload`, `response.status` map từ code nếu có.
- `AxiosClient.isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T>`
  - Giữ detection ổn định để không ảnh hưởng endpoint non-envelope.
- `ExceptionHandler._extractMessage(data, fallback)`
  - Ưu tiên `data.error.message`.
- `ExceptionHandler._extractErrorCode(data, fallback)`
  - Ưu tiên `data.error.code`.
- `ExceptionHandler._handleAxiosError(error)`
  - Nhánh 401 đảm bảo fallback `HTTP_401` + message phù hợp.
- `LoginScreen.finalizeLoginSuccess(response, failurePrefix)`
  - Giữ guard `response.token`.
- `HomeScreen` (new internal funcs):
  - `loadHomeData(): Promise<void>`
  - `resolveDisplayName(): string`
  - `handleRetry(): void`

2. Optional new function (if added):
- `features/home/api.ts#getHomeOverview()`

[Classes]  
Không thêm class mới ngoài việc chỉnh behavior lớp hiện có.

- `AxiosClient` (modified)
  - Chỉnh strategy unwrap/throw để đồng nhất xử lý lỗi envelope.
- Các phần còn lại giữ functional component + object literal APIs.

[Dependencies]  
Không yêu cầu thêm runtime dependency mới cho logic auth/home.

Lưu ý tooling:
- Lint hiện fail do thiếu `eslint-plugin-react-native` trong môi trường.
- Có thể cần cài `eslint-plugin-react-native` để chạy lint đầy đủ (dev-only).

[Testing]  
Kiểm thử tập trung vào auth + home theo đúng yêu cầu cover.

1. Critical auth tests:
- Login sai credentials:
  - UI hiển thị `Invalid email or password`.
  - Không crash `Cannot read properties of undefined (reading 'token')`.
- Login đúng credentials:
  - Nhận token/user và vào app flow bình thường.
- Google login path:
  - Không còn lỗi thiếu `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` khi env đã cấu hình.

2. Home tests:
- Home load thành công:
  - Hiển thị tên user từ auth/store.
  - Hiển thị household info thực từ `/household/overview`.
- Home load thất bại:
  - Hiển thị lỗi + retry hoạt động.

3. Envelope consistency:
- Xác nhận mọi lỗi 401 trong flow auth/home map đúng `error.code`, `error.message`.

4. Static checks:
- `npm run type-check` trong `mobile-app`.
- `npm run lint` nếu plugin đầy đủ.

[Implementation Order]  
Triển khai theo thứ tự từ nền tảng chung đến UI để giảm regression.

1. Cập nhật `TODO.md` cho task mới.
2. Sửa `AxiosClient` envelope error behavior.
3. Củng cố `ExceptionHandler` mapping.
4. Rà/chỉnh auth API wrappers và LoginScreen.
5. Tích hợp HomeScreen với API + store, bỏ hardcode.
6. Cập nhật `.env.example` cho auth/google/api config.
7. Chạy type-check/lint, tổng hợp test auth + home.
8. Chốt kết quả với danh sách các phần đã cover.
