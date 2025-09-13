import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface CartItem {
  id: string;
  type: 'service' | 'part';
  serviceId?: string;
  partId?: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  providerId?: string;
  scheduledAt?: Date;
  category: string;
  icon?: string;
  estimatedDuration?: number;
}

export interface CouponInfo {
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  minAmount?: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  couponCode?: string;
  couponDiscount?: number;
  appliedCoupon?: CouponInfo;
}

interface CartState extends Cart {
  isLoading: boolean;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CART'; payload: Cart }
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> & { quantity?: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'APPLY_COUPON'; payload: CouponInfo & { discount: number } }
  | { type: 'REMOVE_COUPON' };

const initialState: CartState = {
  items: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
  isLoading: false,
};

function calculateTotals(items: CartItem[], appliedCoupon?: CouponInfo): Omit<Cart, 'items' | 'couponCode' | 'couponDiscount' | 'appliedCoupon'> {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.18; // 18% GST
  
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discount = subtotal * (appliedCoupon.value / 100);
    } else {
      discount = appliedCoupon.value;
    }
  }
  
  const total = Math.max(0, subtotal + tax - discount);
  
  return { subtotal, tax, discount, total };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_CART':
      return { ...state, ...action.payload };

    case 'ADD_ITEM': {
      // Create composite key for item identity to prevent collisions
      const itemKey = `${action.payload.type}:${action.payload.serviceId || action.payload.partId || action.payload.id}`;
      const newItem = { ...action.payload, id: itemKey, quantity: action.payload.quantity || 1 };
      
      const existingItemIndex = state.items.findIndex(item => item.id === itemKey);
      let newItems: CartItem[];

      if (existingItemIndex >= 0) {
        // Update existing item quantity
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
            : item
        );
      } else {
        // Add new item
        newItems = [...state.items, newItem];
      }

      const totals = calculateTotals(newItems, state.appliedCoupon);
      return {
        ...state,
        items: newItems,
        ...totals,
      };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      const totals = calculateTotals(newItems, state.appliedCoupon);
      return {
        ...state,
        items: newItems,
        ...totals,
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload);
      const totals = calculateTotals(newItems, state.appliedCoupon);
      return {
        ...state,
        items: newItems,
        ...totals,
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        couponCode: undefined,
        couponDiscount: 0,
        appliedCoupon: undefined,
      };

    case 'APPLY_COUPON': {
      const totals = calculateTotals(state.items, action.payload);
      return {
        ...state,
        couponCode: action.payload.code,
        couponDiscount: action.payload.discount,
        appliedCoupon: {
          code: action.payload.code,
          type: action.payload.type,
          value: action.payload.value,
          minAmount: action.payload.minAmount
        },
        ...totals,
      };
    }

    case 'REMOVE_COUPON': {
      const totals = calculateTotals(state.items, undefined);
      return {
        ...state,
        couponCode: undefined,
        couponDiscount: 0,
        appliedCoupon: undefined,
        ...totals,
      };
    }

    default:
      return state;
  }
}

interface CartContextType {
  cart: CartState;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; discount?: number; message?: string }>;
  removeCoupon: () => void;
  getItemCount: () => number;
  isInCart: (id: string) => boolean;
  getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(`cart_${(user as any)?.uid || 'guest'}`);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        dispatch({ type: 'SET_CART', payload: parsed });
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }, [(user as any)?.uid]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      const cartData = {
        items: cart.items,
        subtotal: cart.subtotal,
        tax: cart.tax,
        discount: cart.discount,
        total: cart.total,
        couponCode: cart.couponCode,
        couponDiscount: cart.couponDiscount,
      };
      localStorage.setItem(`cart_${(user as any)?.uid || 'guest'}`, JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cart, (user as any)?.uid]);

  const addItem = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
    toast({
      title: 'Added to Cart',
      description: `${item.name} has been added to your cart.`,
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
    }
  };

  const removeItem = (id: string) => {
    const item = cart.items.find(item => item.id === id);
    dispatch({ type: 'REMOVE_ITEM', payload: id });
    
    if (item) {
      toast({
        title: 'Removed from Cart',
        description: `${item.name} has been removed from your cart.`,
      });
    }
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    toast({
      title: 'Cart Cleared',
      description: 'All items have been removed from your cart.',
    });
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; discount?: number; message?: string }> => {
    try {
      // Mock coupon validation - replace with actual API call
      const validCoupons: Record<string, CouponInfo> = {
        'SAVE10': { code: 'SAVE10', type: 'fixed', value: 100, minAmount: 500 },
        'WELCOME': { code: 'WELCOME', type: 'fixed', value: 50, minAmount: 200 },
        'FIXIT20': { code: 'FIXIT20', type: 'percentage', value: 20, minAmount: 300 },
      };

      const coupon = validCoupons[code.toUpperCase()];
      
      if (!coupon) {
        return { success: false, message: 'Invalid coupon code' };
      }

      if (cart.subtotal < (coupon.minAmount || 0)) {
        return { 
          success: false, 
          message: `Minimum order amount of ₹${coupon.minAmount} required for this coupon` 
        };
      }

      // Calculate discount based on coupon type
      const discountAmount = coupon.type === 'percentage' 
        ? cart.subtotal * (coupon.value / 100)
        : coupon.value;

      dispatch({ 
        type: 'APPLY_COUPON', 
        payload: { 
          ...coupon, 
          discount: discountAmount 
        } 
      });
      
      toast({
        title: 'Coupon Applied!',
        description: `You saved ₹${discountAmount.toFixed(2)} with code ${code.toUpperCase()}`,
      });

      return { success: true, discount: discountAmount };
    } catch (error) {
      return { success: false, message: 'Failed to apply coupon' };
    }
  };

  const removeCoupon = () => {
    dispatch({ type: 'REMOVE_COUPON' });
    toast({
      title: 'Coupon Removed',
      description: 'Coupon discount has been removed from your cart.',
    });
  };

  const getItemCount = (): number => {
    return cart.items.reduce((count, item) => count + item.quantity, 0);
  };

  const isInCart = (id: string): boolean => {
    return cart.items.some(item => item.id === id);
  };

  const getCartTotal = (): number => {
    return cart.total;
  };

  const value: CartContextType = {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    getItemCount,
    isInCart,
    getCartTotal,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}