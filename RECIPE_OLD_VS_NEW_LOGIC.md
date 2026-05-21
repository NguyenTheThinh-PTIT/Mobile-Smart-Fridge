# 📚 Giải Thích Logic Công Thức Hiện Tại vs Mới

## 🔍 **LOGIC CÔNG THỨC CŨ (Hiện Tại)**

### Database Structure (Cũ)
```sql
recipe (bảng chứa công thức chung)
├── id
├── name
├── instructions
├── cook_time_minutes
├── difficulty

recipe_step (các bước nấu)
└── recipe_id → recipe

recipe_food (nguyên liệu của công thức)
└── recipe_id → recipe

dish (món ăn đã chế biến)
└── recipe_id → recipe
```

### Flow Hiện Tại (Công Thức Chung)

```
RecipesScreen (Trang Công Thức)
    ↓
Hiển thị danh sách công thức từ AI Service
├── "ready" tab: Công thức có đủ nguyên liệu
└── "needToBuy" tab: Công thức cần mua thêm
    ↓
Bấm vào công thức → RecipeDetailScreen
    ↓
Hiển thị chi tiết: tên, thời gian, độ khó, nguyên liệu
    ↓
Bấm "Nấu ăn" → Chuyển sang RecipeStepByStepScreen (hướng dẫn từng bước)
    ↓
Hoàn thành → RecipeConsumptionConfirmScreen (xác nhận trừ kho)
    ↓
Trừ kho (inventory_batch)
```

### Đặc Điểm Công Thức Cũ:
✅ **Gợi ý thông minh**: AI tính toán dựa vào nguyên liệu hiện có
✅ **Hiển thị sẵn**: Không cần tạo, lấy từ DB chung
✅ **Tương tác**: Xem, nấu, trừ kho
❌ **Không thể sửa**: Công thức cố định
❌ **Không thể xoá**: Không thể xoá công thức
❌ **Không thể thêm**: Không tạo công thức riêng

---

## 🆕 **LOGIC CÔNG THỨC MỚI (Sắp Thêm)**

### Database Structure (Mới)
```sql
household_recipe (công thức riêng của từng gia đình)
├── id
├── household_id (gia đình sở hữu)
├── name
├── instructions
├── cook_time_minutes
├── created_by (user tạo)
├── created_date
├── updated_date
└── is_active

household_recipe_step (các bước nấu)
└── household_recipe_id → household_recipe

household_recipe_food (nguyên liệu)
└── household_recipe_id → household_recipe
```

### Flow Mới (Công Thức Riêng)

```
AccountScreen (Trang Tài Khoản)
    ↓
    ┌─────────────────────────────────┐
    │ + MENU ITEM MỚI:                │
    │ "Quản lý công thức"             │
    │ (dưới "Quản lý thành viên")     │
    └─────────────────────────────────┘
    ↓
RecipeManagementScreen (Danh sách công thức của gia đình)
    ├─ Hiển thị: Tên, thời gian, độ khó, người tạo
    ├─ Chức năng: Xem chi tiết, Sửa, Xoá
    └─ Nút "Thêm mới" → RecipeFormScreen
    
    ↓ (Nếu bấm "Thêm mới")
    
RecipeFormScreen (Form tạo/sửa công thức)
    ├─ Input: Tên, Thời gian nấu, Độ khó, Hướng dẫn
    ├─ Nút "Thêm bước" → Thêm recipe_step
    ├─ Nút "Chọn nguyên liệu" → RecipeIngredientEditorScreen
    │
    └─ RecipeIngredientEditorScreen
        ├─ Danh sách Food có sẵn trong DB
        ├─ Chọn food + nhập lượng
        └─ Thêm vào form
    
    ↓ Bấm "Lưu"
    
Backend API: POST /api/v1/household-recipes
    ├─ Lưu vào household_recipe
    ├─ Lưu steps vào household_recipe_step
    ├─ Lưu ingredients vào household_recipe_food
    └─ Trả về success
    
    ↓ Quay lại RecipeManagementScreen
```

### Đặc Điểm Công Thức Mới:
✅ **Tạo mới**: Có thể tạo công thức riêng
✅ **Sửa**: Có thể chỉnh sửa chi tiết công thức
✅ **Xoá**: Có thể xoá công thức không cần
✅ **Quản lý**: Xem danh sách công thức của gia đình
✅ **Riêng tư**: Mỗi household có công thức riêng
❌ **Không gợi ý AI**: Không có gợi ý thông minh (nó là thao tác thủ công)

---

## 📊 So Sánh Chi Tiết

| Tính Năng | Công Thức Cũ | Công Thức Mới |
|-----------|------------|-------------|
| **Nguồn gốc** | AI gợi ý / DB chung | Người dùng tạo |
| **Tạo** | ❌ Không | ✅ Có |
| **Sửa** | ❌ Không | ✅ Có |
| **Xoá** | ❌ Không | ✅ Có |
| **Nấu ăn** | ✅ Có | ✅ Có (sau này) |
| **Trừ kho** | ✅ Tự động | ✅ Tự động (sau này) |
| **Vị trí** | Tab "Công Thức" | Menu tài khoản |
| **Scope** | Toàn cộng đồng | Riêng từng gia đình |
| **Gợi ý** | ✅ Thông minh | ❌ Không |

---

## 🎯 **CẤU TRÚC NAVIGATION**

### Hiện Tại (Cũ):
```
BottomTab Navigator
    ├─ Home
    ├─ Planner
    ├─ Recipes (DÙNG NÀY)
    │   ├─ RecipesScreen (Danh sách gợi ý)
    │   ├─ RecipeDetailScreen (Chi tiết)
    │   ├─ RecipeStepByStepScreen (Hướng dẫn nấu)
    │   └─ RecipeConsumptionConfirmScreen (Xác nhận trừ kho)
    ├─ Chat
    └─ Account
```

### Sau Khi Thêm (Mới):
```
BottomTab Navigator
    ├─ Home
    ├─ Planner
    ├─ Recipes (GIỮ NGUYÊN)
    │   ├─ RecipesScreen (Danh sách gợi ý)
    │   ├─ RecipeDetailScreen (Chi tiết)
    │   ├─ RecipeStepByStepScreen (Hướng dẫn nấu)
    │   └─ RecipeConsumptionConfirmScreen (Xác nhận trừ kho)
    ├─ Chat
    └─ Account (THÊM ROUTE MỚI)
        ├─ AccountScreen
        ├─ ProfileSettings
        ├─ HouseholdManagement
        ├─ ReportSummary
        ├─ RecipeManagement (MỚI) ← Button ở AccountScreen
        │   ├─ RecipeManagementScreen (Danh sách công thức riêng)
        │   ├─ RecipeFormScreen (Tạo/Sửa)
        │   └─ RecipeIngredientEditorScreen (Chọn nguyên liệu)
        ├─ ... (các screen khác)
```

---

## 💡 **ĐIỀU QUAN TRỌNG**

### ✅ HAI SỰ VẬT HOÀN TOÀN RIÊNG BIỆT:

1. **Công Thức Cũ** (Recipe)
   - Được quản lý bởi AI Service
   - Lấy từ database chính
   - Người dùng chỉ có thể: Xem → Nấu → Trừ kho
   - Nằm ở tab "Công Thức"

2. **Công Thức Mới** (HouseholdRecipe) 
   - Được tạo bởi người dùng
   - Lưu riêng cho từng household
   - Người dùng có thể: Tạo → Sửa → Xoá → Quản lý
   - Nằm ở menu "Quản lý công thức" trong tài khoản

### ❌ **KHÔNG ẢNH HƯỞNG ĐẾN NHAU:**
- Thêm công thức mới → Không thay đổi công thức cũ
- Xoá công thức mới → Không ảnh hưởng gợi ý AI
- Sửa công thức mới → Không sửa công thức chung

---

## 📝 **KỊCH BẢN SỬ DỤNG**

### Kịch Bản 1: Người Dùng Muốn Nấu Ăn (Sử Dụng Công Thức Cũ)
```
Mở app → Tab Công Thức → 
Xem danh sách gợi ý → 
Bấm vào công thức → 
Bấm "Nấu ăn" → 
Xem hướng dẫn từng bước → 
Hoàn thành → 
Trừ kho
```

### Kịch Bản 2: Người Dùng Muốn Tạo Công Thức Riêng (Sử Dụng Công Thức Mới)
```
Mở app → Tài khoản → 
Quản lý công thức (MENU MỚI) → 
Bấm "Thêm mới" → 
Nhập tên, thời gian, độ khó → 
Thêm các bước nấu → 
Chọn nguyên liệu → 
Bấm "Lưu" → 
Công thức được lưu ✅
```

### Kịch Bản 3: Người Dùng Muốn Sửa Công Thức Riêng
```
Tài khoản → Quản lý công thức → 
Bấm vào công thức muốn sửa → 
Chỉnh sửa → 
Bấm "Cập nhật" → 
Công thức được cập nhật ✅
```

### Kịch Bản 4: Người Dùng Muốn Xoá Công Thức Riêng
```
Tài khoản → Quản lý công thức → 
Xoá (icon xoá hoặc vuốt) → 
Confirm → 
Công thức bị xoá ✅
```

---

## 📋 **TÓM TẮT**

| Aspect | Old Recipe | New Recipe |
|--------|-----------|-----------|
| **Button ở đâu** | Tab Công Thức | Menu Tài khoản |
| **Chức năng** | Xem + Nấu + Trừ kho | Tạo + Sửa + Xoá |
| **AI** | Có gợi ý | Không gợi ý |
| **Scope** | Toàn công đồng | Riêng gia đình |
| **Table DB** | recipe | household_recipe |
| **Flow** | RecipesScreen → Detail → Cook → Consume | RecipeManagement → Form → Ingredient |

---

## 🚀 **TIẾP THEO**

Khi bạn sẵn sàng, chúng ta sẽ implement:

1. **Backend** (Java Spring Boot):
   - DTOs (RecipeManagementDtos.java)
   - Entity (HouseholdRecipe.java)
   - Repository (HouseholdRecipeRepository.java)
   - Service (HouseholdRecipeService.java)
   - Controller (HouseholdRecipeController.java)

2. **Mobile** (React Native):
   - RecipeManagementScreen.tsx (Danh sách)
   - RecipeFormScreen.tsx (Tạo/Sửa)
   - RecipeIngredientEditorScreen.tsx (Chọn nguyên liệu)
   - API functions
   - Routes & Navigation

3. **Integration**:
   - Update AccountScreen.tsx (Thêm menu item)
   - Update AccountStack.tsx (Thêm routes)
   - Update recipes/api.ts (Thêm API calls)

**Sẵn sàng chưa?** 🚀
