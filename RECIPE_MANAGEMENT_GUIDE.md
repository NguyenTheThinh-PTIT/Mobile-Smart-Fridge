# 📖 Hướng Dẫn Chi Tiết: Chức Năng Quản Lý Công Thức (Option 2)

## ✅ Tóm Tắt Công Việc Đã Hoàn Thành

### 1. **Database Migration (Backend)**
✅ Tạo file: `/home/quang/mobile/backend/src/main/resources/db/migration/V19__add_user_recipe_fields.sql`

**Thay đổi:**
- Thêm 5 column vào table `recipe`:
  - `source` (VARCHAR) - 'ai' hoặc 'user'
  - `created_by` (INT) - user_id tạo công thức
  - `household_id` (INT) - gia đình sở hữu
  - `created_date` (TIMESTAMP) - ngày tạo
  - `updated_date` (TIMESTAMP) - ngày cập nhật

### 2. **Mobile Screens (React Native)**
✅ **RecipeManagementScreen.tsx** - Danh sách công thức riêng
- Hiển thị danh sách công thức (name, cookTime, difficulty)
- Nút "Thêm công thức mới"
- Swipe/tap để xoá
- Pull-to-refresh

✅ **RecipeFormScreen.tsx** - Form tạo/sửa công thức
- Input: Tên, thời gian, độ khó, hướng dẫn
- Thêm/xoá các bước nấu
- Thêm/xoá nguyên liệu
- Nút Lưu

✅ **RecipeIngredientEditorScreen.tsx** - Chọn nguyên liệu
- Danh sách tất cả thực phẩm
- Tìm kiếm
- Chọn food + số lượng + đơn vị
- Thêm vào công thức

### 3. **Navigation Updates**
✅ **AccountStack.tsx** - Thêm routes:
- `RecipeManagement` → RecipeManagementScreen
- `RecipeForm` → RecipeFormScreen
- `RecipeIngredientEditor` → RecipeIngredientEditorScreen

✅ **AccountScreen.tsx** - Thêm menu item:
- "Quản lý công thức" (dưới "Quản lý thành viên")

### 4. **API Client**
✅ **recipes/api.ts** - Thêm functions:
- `getUserRecipes(householdId)`
- `createUserRecipe(householdId, payload)`
- `updateUserRecipe(recipeId, payload)`
- `deleteUserRecipe(recipeId)`
- `getAllFoods()`

---

## 🚀 Cách Sử Dụng - Hướng Dẫn Từng Bước

### **Bước 1: Chạy Migration**

```bash
# Backend đã có migration V19__add_user_recipe_fields.sql
# Khi app khởi động, Flyway sẽ tự động chạy migration

# Hoặc chạy thủ công nếu cần:
cd /home/quang/mobile/backend
mvn flyway:migrate
```

**Kết quả:** Table `recipe` có thêm 5 column mới

```sql
SELECT * FROM recipe WHERE source = 'user' AND household_id = 1;
-- Sẽ hiển thị công thức riêng của household
```

---

### **Bước 2: Chạy Mobile App**

```bash
cd /home/quang/mobile/mobile-app

# Start Expo
npm start

# Chọn option:
# w - web
# i - iOS
# a - Android
# j - Expo Go
```

**Hoặc chạy Docker:**
```bash
cd /home/quang/mobile
docker-compose -f docker-compose.dev.yml up mobile-app
```

---

### **Bước 3: Sử Dụng Chức Năng**

#### **3a. Vào Trang Quản Lý Công Thức**

```
1. Mở app
2. Tab "Tài khoản" (bottom right)
3. Bấm "Quản lý công thức" (menu item mới)
4. Màn hình: RecipeManagementScreen
   ├─ Nếu chưa có công thức → hiển thị "Chưa có công thức nào"
   └─ Nút "➕ Thêm công thức mới"
```

#### **3b. Tạo Công Thức Mới**

```
1. Bấm "➕ Thêm công thức mới"
2. Vào RecipeFormScreen
3. Nhập thông tin:
   ├─ Tên công thức: "Mỳ Ý cà chua" *
   ├─ Thời gian nấu: 30 phút (± button)
   ├─ Độ khó: Dễ / Trung bình / Khó
   ├─ Hướng dẫn: (optional)
   ├─ Các bước nấu:
   │  └─ Bấm + để thêm bước
   │     - Step 1: "Rửa sạch nguyên liệu"
   │     - Step 2: "Cắt nhỏ hành"
   │     - v.v...
   └─ Nguyên liệu: *
      └─ Bấm + "Chọn nguyên liệu"
         1. Vào RecipeIngredientEditorScreen
         2. Tìm kiếm hoặc scroll danh sách
         3. Chọn "Cà chua"
         4. Nhập số lượng: 200
         5. Chọn đơn vị: g
         6. Bấm "Thêm nguyên liệu"
         7. Quay lại form → hiển thị "Cà chua 200 g"
         8. Lặp lại cho nguyên liệu khác
4. Bấm "Lưu công thức"
5. Alert: "Thành công! Công thức đã được tạo"
6. Quay lại RecipeManagementScreen
7. Công thức xuất hiện trong danh sách
```

#### **3c. Sửa Công Thức**

```
1. RecipeManagementScreen
2. Bấm vào công thức muốn sửa
3. Vào RecipeFormScreen (mode: edit)
4. Data được populate từ DB
5. Chỉnh sửa các field
6. Bấm "Lưu công thức"
7. Alert: "Thành công! Công thức đã được cập nhật"
```

#### **3d. Xoá Công Thức**

```
1. RecipeManagementScreen
2. Bấm icon xoá (trash icon) trên công thức
3. Alert confirm: "Bạn có chắc muốn xóa 'Mỳ Ý cà chua'?"
4. Bấm "Xóa"
5. Alert: "Thành công! Công thức đã được xóa"
6. Công thức biến mất từ danh sách
```

---

## 📊 Flow Dữ Liệu

### **Khi Tạo Công Thức:**

```
RecipeFormScreen
    ↓ (Người dùng nhập data)
    {
      name: "Mỳ Ý cà chua",
      cookTimeMinutes: 30,
      difficulty: "Trung bình",
      instructions: "...",
      steps: [
        { stepNumber: 1, instruction: "..." },
        { stepNumber: 2, instruction: "..." }
      ],
      ingredients: [
        { foodId: 5, foodName: "Cà chua", requireQuantity: 200, unit: "g" },
        { foodId: 12, foodName: "Hành", requireQuantity: 100, unit: "g" }
      ],
      source: "user",
      householdId: 1,
      createdBy: 1025 (user_id)
    }
    ↓ (POST request)
POST /api/v1/recipes
    ↓ Backend (RecipeController)
    INSERT INTO recipe (name, instructions, cook_time_minutes, difficulty, source, created_by, household_id, created_date)
    INSERT INTO recipe_step (recipe_id, step_number, instruction)
    INSERT INTO recipe_food (recipe_id, food_id, require_quantity, unit)
    ↓
    Response: { id: 123, name: "Mỳ Ý cà chua", ... }
    ↓
RecipeManagementScreen (refresh)
    ↓
SELECT * FROM recipe WHERE source = 'user' AND household_id = 1
    ↓
Hiển thị danh sách công thức mới
```

---

## 🔍 Kiểm Tra Dữ Liệu

### **Backend - Check Database:**

```bash
# Kết nối PostgreSQL
psql -U fridge_user -d fridge_ai -h localhost

# Query công thức riêng
SELECT id, name, source, household_id, created_by, created_date 
FROM recipe 
WHERE source = 'user' AND household_id = 1;

# Query nguyên liệu
SELECT rf.id, rf.recipe_id, f.name, rf.require_quantity, rf.unit
FROM recipe_food rf
JOIN food f ON f.id = rf.food_id
WHERE rf.recipe_id = 123;

# Query bước nấu
SELECT * FROM recipe_step WHERE recipe_id = 123 ORDER BY step_number;
```

### **Mobile - Check Logs:**

```bash
# Run Expo
npm start

# Check console output:
# - "[HTTP Request] POST /recipes" ✅
# - "[HTTP Response] 200" ✅
# - Hoặc error logs nếu có

# Hoặc dùng React Native Debugger
# Xem Network tab
```

---

## ⚠️ Các Lỗi Thường Gặp & Cách Fix

### **Lỗi 1: "Không thể tải công thức"**

**Nguyên nhân:** Backend API không hoạt động hoặc endpoint sai

**Cách fix:**
```bash
# Check backend đang chạy:
curl http://localhost:8080/api/v1/recipes/household?householdId=1&source=user

# Nếu 404 → endpoint chưa implement
# Nếu 500 → check backend logs
# Nếu 200 → OK, vấn đề ở mobile
```

### **Lỗi 2: "Danh sách nguyên liệu trống"**

**Nguyên nhân:** API /foods không trả dữ liệu

**Cách fix:**
```bash
# Check foods trong DB:
psql -U fridge_user -d fridge_ai -h localhost
SELECT COUNT(*) FROM food;
# Nếu = 0 → seed data

# Hoặc gọi API:
curl http://localhost:8080/api/v1/foods
```

### **Lỗi 3: "Migration failed"**

**Nguyên nhân:** Column đã tồn tại hoặc syntax error

**Cách fix:**
```bash
# Check column tồn tại:
psql -U fridge_user -d fridge_ai -h localhost
\d recipe;
# Nếu có column source/created_by/household_id → bỏ qua, chạy app

# Hoặc xoá và tạo lại:
mvn flyway:clean
mvn flyway:migrate
```

### **Lỗi 4: "Cannot navigate to undefined route"**

**Nguyên nhân:** Route chưa được register trong AccountStack

**Cách fix:**
- ✅ Kiểm tra AccountStack.tsx có 3 route mới:
  - RecipeManagement
  - RecipeForm
  - RecipeIngredientEditor

---

## 📱 Giao Diện Preview

### **RecipeManagementScreen**
```
┌─────────────────────────────┐
│ ← Quản lý công thức         │
├─────────────────────────────┤
│ 📋 Danh sách công thức:     │
│                             │
│ ┌─ Mỳ Ý cà chua     [🗑]   │
│ │ ⏱ 30 phút | 🔥 Trung bình│
│ └─────────────────────────  │
│                             │
│ ┌─ Canh chua cá     [🗑]   │
│ │ ⏱ 45 phút | 🔥 Khó       │
│ └─────────────────────────  │
│                             │
├─────────────────────────────┤
│   [➕ Thêm công thức mới]   │
└─────────────────────────────┘
```

### **RecipeFormScreen**
```
┌─────────────────────────────┐
│ ← Tạo công thức mới         │
├─────────────────────────────┤
│ Tên: [Mỳ Ý cà chua____]    │
│ Thời gian: [30] phút        │
│ Độ khó: [Dễ] [Trung] [Khó] │
│ Hướng dẫn: [__________]     │
│                             │
│ 📝 Bước nấu:                │
│ 1️⃣  Rửa nguyên liệu [×]   │
│ 2️⃣  Cắt nhỏ hành    [×]   │
│ [➕ Thêm bước]              │
│                             │
│ 🍱 Nguyên liệu:             │
│ • Cà chua 200g    [×]       │
│ • Hành 100g       [×]       │
│ [➕ Thêm nguyên liệu]       │
│                             │
├─────────────────────────────┤
│  [Lưu] [Hủy]                │
└─────────────────────────────┘
```

---

## 🧪 Test Cases

### **Test Case 1: Tạo Công Thức Hoàn Chỉnh**
```
Step:
1. Tài khoản → Quản lý công thức
2. Thêm mới
3. Nhập: Tên="Canh chua cá", Thời gian=45, Độ khó="Khó"
4. Thêm step: "Chuẩn bị nguyên liệu", "Nấu 20 phút", "Nêm gia vị"
5. Thêm ingredients: Cá (500g), Chua (200g), Hành (50g)
6. Lưu

Expected: Công thức xuất hiện trong danh sách ✅
```

### **Test Case 2: Sửa Công Thức**
```
Step:
1. Bấm vào công thức "Canh chua cá"
2. Thay đổi thời gian từ 45 → 50
3. Xoá step cuối
4. Lưu

Expected: Công thức được cập nhật, hiển thị 50 phút ✅
```

### **Test Case 3: Xoá Công Thức**
```
Step:
1. Bấm trash icon trên "Mỳ Ý cà chua"
2. Confirm xoá

Expected: Công thức biến mất ✅
```

### **Test Case 4: Kiểm Tra DB**
```
Step:
1. Query: SELECT * FROM recipe WHERE source='user' AND household_id=1
2. Kiểm tra số bản ghi tương ứng

Expected: Số bản ghi = số công thức trong app ✅
```

---

## 📋 Checklist Hoàn Thành

- [x] Migration V19 tạo thành công
- [x] RecipeManagementScreen implement
- [x] RecipeFormScreen implement
- [x] RecipeIngredientEditorScreen implement
- [x] AccountStack cập nhật routes
- [x] AccountScreen thêm menu item
- [x] recipes/api.ts thêm functions
- [ ] Test tạo công thức
- [ ] Test sửa công thức
- [ ] Test xoá công thức
- [ ] Check DB data
- [ ] End-to-end test

---

## 🔗 Các File Liên Quan

**Backend:**
- `/home/quang/mobile/backend/src/main/resources/db/migration/V19__add_user_recipe_fields.sql` ✅

**Mobile:**
- `/home/quang/mobile/mobile-app/src/features/account/RecipeManagementScreen.tsx` ✅
- `/home/quang/mobile/mobile-app/src/features/account/RecipeFormScreen.tsx` ✅
- `/home/quang/mobile/mobile-app/src/features/account/RecipeIngredientEditorScreen.tsx` ✅
- `/home/quang/mobile/mobile-app/src/features/account/AccountScreen.tsx` ✅ (updated)
- `/home/quang/mobile/mobile-app/src/features/account/AccountStack.tsx` ✅ (updated)
- `/home/quang/mobile/mobile-app/src/features/recipes/api.ts` ✅ (updated)

---

## ❓ Câu Hỏi Thường Gặp

**Q1: Công thức riêng có bị ảnh hưởng bởi AI gợi ý không?**
A: KHÔNG. Vì `source = 'user'`, nên ai gợi ý query `source = 'ai'` sẽ không thấy.

**Q2: Khi nào mình có thể nấu ăn từ công thức riêng và trừ kho?**
A: Đó là Phase 2. Bây giờ chỉ có quản lý (tạo/sửa/xoá).

**Q3: Tại sao không tạo bảng household_recipe riêng?**
A: Vì gộp vào recipe cũ thì:
- Không cần migration phức tạp
- Dễ tìm kiếm (1 bảng)
- Dễ scale (AI có thể query cùng bảng sau này)

**Q4: Các bước và nguyên liệu lưu ở đâu?**
A: Vẫn ở `recipe_step` và `recipe_food` như cũ, chỉ thêm `recipe_id` foreign key.

---

## 🎉 Kết Luận

✅ **Đã implement Option 2 thành công!**

**Tính năng:**
- ✅ Tạo công thức riêng
- ✅ Sửa công thức
- ✅ Xoá công thức
- ✅ Quản lý steps & ingredients
- ✅ Tìm kiếm nguyên liệu
- ✅ Không ảnh hưởng công thức cũ

**Bước tiếp theo:**
- Chạy migration
- Test chức năng
- Deploy

**Hãy test và báo lỗi nếu có!** 🚀
