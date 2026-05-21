import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FoodInventoryScreen } from './FoodInventoryScreen';
import { FoodDetailScreen } from './FoodDetailScreen';
import { ActivityHistoryScreen } from './ActivityHistoryScreen';
import { FoodFormScreen } from './FoodFormScreen';
import { InvoicePreviewScreen } from './InvoicePreviewScreen';
import { InventoryProvider } from './InventoryContext';

const Stack = createStackNavigator();

export const InventoryStack: React.FC = () => {
  return (
    <InventoryProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="FoodInventory">
        <Stack.Screen name="FoodInventory" component={FoodInventoryScreen} />
        <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
        <Stack.Screen name="FoodForm" component={FoodFormScreen} />
        <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
        <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen} />
      </Stack.Navigator>
    </InventoryProvider>
  );
};
