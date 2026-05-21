import { axiosClient } from '@/core/network/AxiosClient';
import { ExceptionHandler } from '@/core/error/ExceptionHandler';

/**
 * Inventory API - API endpoints for inventory management
 */
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  category: string;
}

export interface InvoiceScanItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedExpiryDays?: number;
}

export interface InvoiceConfirmItem {
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  category: string;
}

export const inventoryApi = {
  /**
   * Get all inventory items (optionally filter by category)
   */
  getItems: async (): Promise<InventoryItem[]> => {
    try {
      return await axiosClient.get('/inventory');
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Get item by id
   */
  getItemById: async (itemId: string): Promise<InventoryItem> => {
    try {
      return await axiosClient.get(`/inventory/${itemId}`);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Create new item
   */
  createItem: async (_inventoryId: string, item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
    try {
      return await axiosClient.post(`/inventory`, item);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Update item
   */
  updateItem: async (_inventoryId: string, itemId: string, item: Partial<InventoryItem>): Promise<InventoryItem> => {
    try {
      return await axiosClient.put(`/inventory/${itemId}`, item);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Delete item
   */
  deleteItem: async (_inventoryId: string, itemId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/inventory/${itemId}`);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Scan invoice image and extract food items
   */
  scanInvoice: async (imageUri: string): Promise<InvoiceScanItem[]> => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'invoice.jpg',
      } as any);

      // Use raw axios to send FormData
      const response = await axiosClient.getAxios().post(`/inventory/invoice/scan`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Handle ApiEnvelope response
      if (response.data?.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      throw new Error('Invalid scan response format');
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Confirm and save scanned invoice items to inventory
   */
  confirmInvoiceItems: async (items: InvoiceConfirmItem[]): Promise<void> => {
    try {
      await axiosClient.post(`/inventory/invoice/confirm`, { items });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },
};
