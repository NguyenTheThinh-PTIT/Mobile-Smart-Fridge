# 🚀 QUICK START - Quản Lý Công Thức (Option 2)

## ✅ Các File Đã Tạo/Sửa

### **Backend Migration**
```
✅ /home/quang/mobile/backend/src/main/resources/db/migration/V19__add_user_recipe_fields.sql
   - ALTER TABLE recipe ADD COLUMN source VARCHAR(50) DEFAULT 'ai'
   - ALTER TABLE recipe ADD COLUMN created_by INT
   - ALTER TABLE recipe ADD COLUMN household_id INT
   - ALTER TABLE recipe ADD COLUMN created_date TIMESTAMP
   - ALTER TABLE recipe ADD COLUMN updated_date TIMESTAMP
```

### **Mobile Screens (React Native)**
```
✅ /home/quang/mobile/mobile-app/src/features/account/RecipeManagementScreen.tsx (NEW)
   - Danh sách công thức riêng của household
   - Nút Thêm, Sửa, Xoá

✅ /home/quang/mobile/mobile-app/src/features/account/RecipeFormScreen.tsx (NEW)
   - Form tạo/sửa công thức
   - Thêm/xoá bước nấu
   - Thêm/xoá nguyên liệu

✅ /home/quang/mobile/mobile-app/src/features/account/RecipeIngredientEditorScreen.tsx (NEW)
   - Chọn nguyên liệu từ danh sách
   - Tìm kiếm, chọn số lượng, đơn vị
```

### **Updated Files**
```
✅ /home/quang/mobile/mobile-app/src/features/account/AccountScreen.tsx
   - Thêm menu item: "Quản lý công thức"

✅ /home/quang/mobile/mobile-app/src/features/account/AccountStack.tsx
   - Thêm 3 routes: RecipeManagement, RecipeForm, RecipeIngredientEditor

✅ /home/quang/mobile/mobile-app/src/features/recipes/api.ts
   - getUserRecipes()
   - createUserRecipe()
   - updateUserRecipe()
   - deleteUserRecipe()
   - getAllFoods()
```

---

## 🎯 Các Bước Chạy

### **Step 1: Chạy Backend**

```bash
cd /home/quang/mobile/backend

# Compile & migrate database
mvn clean package -DskipTests

# Run backend
java -jar target/fridge-ai-backend-1.0.0-SNAPSHOT.jar

# Hoặc dùng Docker:
docker-compose up backend
```

**Kiểm tra:**
```bash
curl http://localhost:8080/actuator/health
# Response: {"status":"UP"}
```

---

### **Step 2: Chạy Mobile App**

```bash
cd /home/quang/mobile/mobile-app

# Install dependencies
npm install

# Start Expo
npm start

# Chọn: i (iOS) hoặc a (Android) hoặc w (Web)
```

**Hoặc dùng Docker Compose:**
```bash
cd /home/quang/mobile
docker-compose -f docker-compose.dev.yml up -d
# App sẽ chạy ở http://localhost:8081
```

---

### **Step 3: Sử Dụng Chức Năng**

```
1. Đăng nhập vào app
2. Tab "Tài khoản" (bottom right)
3. Bấm "Quản lý công thức" (menu item mới)
4. Bấm "➕ Thêm công thức mới"
5. Nhập:
   - Tên: "Mỳ Ý cà chua"
   - Thời gian: 30 phút
   - Độ khó: Trung bình
   - Thêm bước & nguyên liệu
6. Bấm "Lưu công thức"
7. Công thức xuất hiện trong danh sách ✅
```

---

## 📊 Cấu Trúc Dữ Liệu

### **recipe table (cột mới)**
```sql
recipe {
  id: 123,
  name: "Mỳ Ý cà chua",
  instructions: "...",
  cook_time_minutes: 30,
  difficulty: "Trung bình",
  
  -- CÓ TỪ TRƯỚC:
  -- (không thay đổi)
  
  -- THÊM MỚI (V19 migration):
  source: "user",           -- 'ai' hoặc 'user'
  created_by: 1025,         -- user_id tạo
  household_id: 1,          -- gia đình sở hữu
  created_date: "2026-04-09 10:30:00",
  updated_date: "2026-04-09 10:30:00"
}
```

**Query công thức riêng:**
```sql
SELECT * FROM recipe 
WHERE source = 'user' AND household_id = 1;
```

**Query công thức AI:**
```sql
SELECT * FROM recipe 
WHERE source = 'ai';
-- hoặc: WHERE household_id IS NULL
```

---

## 🔍 Testing

### **Test Case 1: Tạo Công Thức**

```bash
# Mobile:
1. Quản lý công thức → Thêm mới
2. Nhập dữ liệu
3. Bấm Lưu

# Backend - Check log:
[HTTP Request] POST /recipes
[HTTP Response] 200

# Database - Check:
SELECT * FROM recipe WHERE source = 'user' ORDER BY created_date DESC LIMIT 1;
```

### **Test Case 2: Sửa Công Thức**

```bash
# Mobile:
1. Bấm vào công thức
2. Chỉnh sửa
3. Bấm Lưu

# Database - Check:
SELECT * FROM recipe WHERE id = 123;
-- updated_date phải > created_date
```

### **Test Case 3: Xoá Công Thức**

```bash
# Mobile:
1. Bấm trash icon
2. Confirm

# Database - Check:
SELECT * FROM recipe WHERE id = 123;
-- Phải không tìm thấy (record bị xóa)
```

---

## ⚠️ Lỗi Thường Gặp

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-----------|----------|
| "Không thể tải công thức" | Backend không chạy | `curl http://localhost:8080/api/v1/recipes/household?householdId=1&source=user` |
| "Danh sách nguyên liệu trống" | Foods chưa seed | `SELECT COUNT(*) FROM food;` → nếu 0, seed dữ liệu |
| "Migration failed" | Column đã tồn tại | Check xem column đã có chưa: `\d recipe;` |
| "Cannot navigate to undefined route" | Route không register | Check AccountStack.tsx có 3 route mới không |
| "Không thể lưu công thức" | Validation fail | Check logs: có required field trống không |

---

## 📱 Navigation Flow

```
Bottom Tab
├─ Home
├─ Planner
├─ Recipes (cũ - không thay đổi)
├─ Chat
└─ Account (UPDATED)
   └─ AccountScreen (UPDATED)
      └─ Menu item "Quản lý công thức" (NEW)
         └─ RecipeManagement (NEW)
            ├─ RecipeForm (NEW)
            │  └─ RecipeIngredientEditor (NEW)
            └─ ... (action delete)
```

---

## 🎯 Tính Năng

| Tính Năng | Trạng Thái | Ghi Chú |
|-----------|---------|--------|
| Tạo công thức | ✅ | Lưu vào `recipe` với `source='user'` |
| Sửa công thức | ✅ | Update `recipe`, `recipe_step`, `recipe_food` |
| Xoá công thức | ✅ | Cascade delete steps & foods |
| Tìm nguyên liệu | ✅ | Query từ `food` table |
| Nấu ăn từ công thức riêng | ❌ | Phase 2 (tuần sau) |
| Trừ kho | ❌ | Phase 2 (tuần sau) |
| AI đọc công thức riêng | ❌ | Phase 2 (tuần sau) |

---

## 📞 Support

Nếu có lỗi:
1. Check backend logs: `/home/quang/mobile/backend/logs/application.log`
2. Check mobile console: `npm start` output
3. Check database: `psql` query
4. Check API: `curl http://localhost:8080/api/v1/...`

---

## ✅ Checklist

- [ ] Backend chạy thành công
- [ ] Migration V19 chạy thành công
- [ ] Mobile app load không lỗi
- [ ] Tab "Quản lý công thức" xuất hiện
- [ ] Tạo được công thức mới
- [ ] Sửa được công thức
- [ ] Xoá được công thức
- [ ] Data lưu vào database đúng
- [ ] Tìm kiếm nguyên liệu hoạt động

---

**Chúc bạn thành công! 🎉**
