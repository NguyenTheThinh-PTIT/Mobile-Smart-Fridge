import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { inventoryApi } from './api';
import { InventoryItem } from './api';
import { useHousehold } from '@/features/account/HouseholdContext';

export interface InventoryFood {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
}

export interface InventoryFoodInput {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
}

interface InventoryContextValue {
  foods: InventoryFood[];
  addFood: (payload: InventoryFoodInput) => InventoryFood;
  updateFood: (id: string, payload: InventoryFoodInput) => InventoryFood | null;
  deleteFood: (id: string) => void;
  getFoodById: (id: string) => InventoryFood | null;
  syncFromServer: (inventoryId?: string) => Promise<void>;
}

const INITIAL_FOODS: InventoryFood[] = [];

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

const toInventoryFood = (item: InventoryItem): InventoryFood => ({
  ...item,
  expiryDate: item.expiryDate ?? '',
});


export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [foods, setFoods] = useState<InventoryFood[]>(INITIAL_FOODS);
  const { household } = useHousehold();
  const inventoryId = household?.id?.toString();

  const syncFromServer = useCallback(async () => {
    try {
      const items = await inventoryApi.getItems();
      if (Array.isArray(items)) {
        setFoods(items.map(toInventoryFood));
      } else {
        setFoods([]);
      }
    } catch (error) {
      console.warn('[InventoryContext] Failed to sync inventory from API', error);
    }
  }, []);

  // Thêm mới thực phẩm dùng inventoryId thực tế
  const addFood = useCallback((payload: InventoryFoodInput) => {
    if (!inventoryId) {
      console.warn('[InventoryContext] No inventoryId available, cannot add food');
      return { id: '', ...payload };
    }

    // Generate unique ID: timestamp + random 6-digit number to avoid collisions
    // when adding multiple items quickly (e.g., from OCR invoice)
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const optimisticId = `${timestamp}-${randomSuffix}`;
    
    const createdItem: InventoryFood = {
      id: optimisticId,
      ...payload,
    };
    setFoods((prev) => [createdItem, ...prev]);

inventoryApi
      .createItem(inventoryId!, payload)
      .then((serverItem) => {
        const normalizedServerItem = toInventoryFood(serverItem);
        setFoods((prev) => prev.map((food) => (food.id === optimisticId ? normalizedServerItem : food)));
      })
      .catch((error) => {
        console.warn('[InventoryContext] Failed to create inventory item', error);
        // Remove optimistic item on error
        setFoods((prev) => prev.filter((food) => food.id !== optimisticId));
      });

    return createdItem;
  }, [inventoryId]);

  const updateFood = useCallback((id: string, payload: InventoryFoodInput) => {
    if (!inventoryId) {
      console.warn('[InventoryContext] No inventoryId available, cannot update food');
      return null;
    }

    let updatedItem: InventoryFood | null = null;
    setFoods((prev) =>
      prev.map((food) => {
        if (food.id !== id) {
          return food;
        }
        updatedItem = { ...food, ...payload };
        return updatedItem;
      })
    );

    if (updatedItem) {
      inventoryApi.updateItem(inventoryId, id, payload).catch((error) => {
        console.warn('[InventoryContext] Failed to update inventory item', error);
        // Revert optimistic update on error
        setFoods((prev) => prev.map((food) => (food.id === id ? { ...food, ...payload } : food)));
      });
    }
    return updatedItem;
  }, [inventoryId]);

  const deleteFood = useCallback((id: string) => {
    if (!inventoryId) {
      console.warn('[InventoryContext] No inventoryId available, cannot delete food');
      return;
    }

    const deletedFood = foods.find((f) => f.id === id);
    setFoods((prev) => prev.filter((food) => food.id !== id));

    inventoryApi.deleteItem(inventoryId, id).catch((error) => {
      console.warn('[InventoryContext] Failed to delete inventory item', error);
      // Restore item on error
      if (deletedFood) {
        setFoods((prev) => [deletedFood, ...prev]);
      }
    });
  }, [inventoryId, foods]);

  const getFoodById = useCallback(
    (id: string) => foods.find((food) => food.id === id) ?? null,
    [foods]
  );

  const value = useMemo(
    () => ({ foods, addFood, updateFood, deleteFood, getFoodById, syncFromServer }),
    [foods, addFood, updateFood, deleteFood, getFoodById, syncFromServer]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
};
