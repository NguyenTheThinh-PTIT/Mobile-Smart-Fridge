# 📋 Chức Năng Quản Lý Công Thức (Recipe Management)

## 🎯 Mục Tiêu
Thêm chức năng quản lý công thức (thêm, sửa, xoá) cho phép người dùng tạo và quản lý công thức riêng.

---

## 📊 Database Schema (Thêm mới - Không thay đổi cũ)

### Tạo file migration mới: `V19__create_household_recipes.sql`

```sql
-- Bảng lưu công thức của household (riêng tư, không phải công thức chung)
CREATE TABLE household_recipe (
    id SERIAL PRIMARY KEY,
    household_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    instructions TEXT,
    cook_time_minutes INT,
    difficulty VARCHAR(100),
    created_by INT,                    -- user_id tạo công thức
    created_date TIMESTAMP DEFAULT NOW(),
    updated_date TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT fk_hr_household FOREIGN KEY (household_id) REFERENCES household(id),
    CONSTRAINT fk_hr_created_by FOREIGN KEY (created_by) REFERENCES "user"(id)
);

-- Bảng lưu các bước nấu ăn cho household_recipe
CREATE TABLE household_recipe_step (
    id SERIAL PRIMARY KEY,
    household_recipe_id INT NOT NULL,
    step_number INT,
    instruction TEXT,
    media_url VARCHAR(255),
    CONSTRAINT fk_hrs_recipe FOREIGN KEY (household_recipe_id) REFERENCES household_recipe(id) ON DELETE CASCADE
);

-- Bảng lưu nguyên liệu cho household_recipe
CREATE TABLE household_recipe_food (
    id SERIAL PRIMARY KEY,
    household_recipe_id INT NOT NULL,
    food_id INT NOT NULL,
    require_quantity FLOAT8,
    unit VARCHAR(50),
    CONSTRAINT fk_hrf_recipe FOREIGN KEY (household_recipe_id) REFERENCES household_recipe(id) ON DELETE CASCADE,
    CONSTRAINT fk_hrf_food FOREIGN KEY (food_id) REFERENCES food(id)
);

-- Index cho performance
CREATE INDEX idx_household_recipe_household_id ON household_recipe(household_id);
CREATE INDEX idx_household_recipe_created_by ON household_recipe(created_by);
```

---

## 🏗️ Backend Implementation

### 1. **DTO/Entity Classes** (RecipeManagementDtos.java)
```java
// DTOs cho quản lý công thức riêng
- HouseholdRecipeDTO (id, name, cookTimeMinutes, difficulty, createdBy, createdDate)
- RecipeIngredientDTO (foodId, foodName, requireQuantity, unit)
- RecipeStepDTO (stepNumber, instruction, mediaUrl)
- CreateRecipeRequest (name, instructions, cookTimeMinutes, difficulty, steps[], ingredients[])
- UpdateRecipeRequest (name, instructions, cookTimeMinutes, difficulty, steps[], ingredients[])
```

### 2. **Repository/Service**
- `HouseholdRecipeRepository.java` - JPA Repository
- `HouseholdRecipeService.java` - Business logic:
  - `getRecipesByHousehold(householdId)` - Lấy danh sách công thức
  - `getRecipeDetail(recipeId)` - Chi tiết công thức
  - `createRecipe(householdId, request)` - Thêm mới
  - `updateRecipe(recipeId, request)` - Sửa
  - `deleteRecipe(recipeId)` - Xoá

### 3. **Controller** (HouseholdRecipeController.java)
```
GET  /api/v1/household-recipes         - Lấy danh sách
GET  /api/v1/household-recipes/{id}    - Chi tiết
POST /api/v1/household-recipes         - Thêm mới
PUT  /api/v1/household-recipes/{id}    - Sửa
DELETE /api/v1/household-recipes/{id}  - Xoá
```

---

## 📱 Mobile App Implementation

### 1. **Screens**
- `RecipeManagementScreen.tsx` - Danh sách công thức (hiển thị, xoá)
- `RecipeFormScreen.tsx` - Form thêm/sửa công thức
- `RecipeIngredientEditorScreen.tsx` - Chọn nguyên liệu

### 2. **Navigation**
- Thêm route vào `AccountStack.tsx`:
  ```
  <Stack.Screen name="RecipeManagement" component={RecipeManagementScreen} />
  <Stack.Screen name="RecipeForm" component={RecipeFormScreen} />
  <Stack.Screen name="RecipeIngredientEditor" component={RecipeIngredientEditorScreen} />
  ```

### 3. **API Client** (recipes/api.ts)
```typescript
- getHouseholdRecipes(householdId): Promise<HouseholdRecipe[]>
- getHouseholdRecipeDetail(recipeId): Promise<RecipeDetail>
- createHouseholdRecipe(householdId, payload): Promise<HouseholdRecipe>
- updateHouseholdRecipe(recipeId, payload): Promise<HouseholdRecipe>
- deleteHouseholdRecipe(recipeId): Promise<void>
```

### 4. **AccountScreen.tsx**
Thêm menu item sau "Quản lý thành viên":
```typescript
{ id: 'recipes', label: 'Quản lý công thức', icon: 'restaurant-outline', route: 'RecipeManagement' }
```

---

## 🔄 Flow Luồng Công Việc

### Thêm công thức:
1. User bấm nút "Quản lý công thức" ở trang tài khoản
2. Vào `RecipeManagementScreen` → Bấm "Thêm mới"
3. Vào `RecipeFormScreen` → Nhập tên, thời gian nấu, độ khó
4. Thêm bước nấu (step)
5. Bấm chọn nguyên liệu → `RecipeIngredientEditorScreen` → Chọn food từ danh sách + nhập lượng
6. Bấm "Lưu" → Call API `POST /api/v1/household-recipes`
7. Quay lại danh sách

### Sửa công thức:
1. `RecipeManagementScreen` → Bấm vào công thức
2. Vào `RecipeFormScreen` (populate data cũ)
3. Sửa các field → Bấm "Cập nhật"
4. Call API `PUT /api/v1/household-recipes/{id}`

### Xoá công thức:
1. `RecipeManagementScreen` → Vuốt hoặc bấm icon xoá
2. Confirm dialog
3. Call API `DELETE /api/v1/household-recipes/{id}`

---

## ✅ Checklist Implementation

### Backend:
- [ ] Tạo migration V19__create_household_recipes.sql (thêm mới, không sửa)
- [ ] Tạo RecipeManagementDtos.java (DTOs)
- [ ] Tạo HouseholdRecipe entity (JPA)
- [ ] Tạo HouseholdRecipeRepository (JPA)
- [ ] Tạo HouseholdRecipeService (Business logic)
- [ ] Tạo HouseholdRecipeController (REST APIs)

### Mobile:
- [ ] Tạo RecipeManagementScreen.tsx
- [ ] Tạo RecipeFormScreen.tsx
- [ ] Tạo RecipeIngredientEditorScreen.tsx
- [ ] Update AccountScreen.tsx (thêm menu item)
- [ ] Update AccountStack.tsx (thêm routes)
- [ ] Update recipes/api.ts (thêm API functions)

### Testing:
- [ ] Test thêm công thức
- [ ] Test sửa công thức
- [ ] Test xoá công thức
- [ ] Test không ảnh hưởng đến tính năng khác

---

## 🚨 Lưu Ý Quan Trọng

1. **Không sửa migration cũ** - Tạo migration mới V19
2. **Không thay đổi công thức chung** - recipe table giữ nguyên
3. **Household-specific** - Mỗi household có công thức riêng
4. **Authorization** - Check user thuộc household nào trước khi return data
5. **Cascade delete** - Xoá household_recipe → xoá steps và ingredients tự động

---

## 📈 Future Enhancement (Sau này)

1. Chia sẻ công thức giữa các household
2. Rating công thức
3. Bình luận / ghi chú
4. OCR công thức từ ảnh
5. Sync công thức từ website
