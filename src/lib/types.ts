// ============================================
// ENUMS Y CONSTANTES
// ============================================

export type OrderChannel = 'mercadolibre' | 'wix';
export type OrderStatus = 'nuevo' | 'preparando' | 'enviado' | 'entregado' | 'cancelado';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

export interface Order {
  id: string;
  order_id: string;
  channel: OrderChannel;
  pack_id?: string | null;
  shipping_id?: string | null;
  status: OrderStatus;
  order_date: string;
  closed_date?: string | null;
  created_at: string;
  updated_at: string;
  total_amount: number;
  paid_amount?: number;
  currency: string;
  customer: CustomerInfo;
  shipping_address?: ShippingAddress | null;
  items: OrderItem[];
  payment_info?: PaymentInfo | null;
  tags?: string[];
  notes?: string | null;
  logistic_type?: string | null;  // Solo ML: 'fulfillment' | 'self_service' | 'cross_docking'
  halcon_serial?: number | null;  // Serial asignado en Halcon al migrar; null = no migrado
  // Presente solo en packs de ML agrupados (no viene de la DB)
  subOrders?: Order[];
}

export interface CustomerInfo {
  source: 'mercadolibre' | 'wix';
  id: string;
  nickname?: string;           // ML
  email?: string;              // Wix
  firstName?: string;          // Wix
  lastName?: string;           // Wix
  phone?: string;              // Wix
}

export interface ShippingAddress {
  street: string;
  comment?: string;       // Complemento: apto, piso, referencia
  neighborhood?: string;  // Barrio
  city: string;
  state: string;
  country: string;
  zipCode: string;
  receiverName?: string;
  receiverPhone?: string;
  latitude?: number;      // Coordenadas geográficas (ML)
  longitude?: number;
  notes?: string;
}

export interface OrderItem {
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  fullPrice: number;
  currency: string;
  imageUrl?: string;
  variationAttributes?: Array<{
    name: string;
    value: string;
  }>;
}

export interface PaymentInfo {
  method?: string;
  status?: string;
  installments?: number;
  paidAmount?: number;
  paymentDate?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  changed_at: string;
  notes?: string;
}

// ============================================
// FILTROS Y QUERIES
// ============================================

export interface OrderFilters {
  status?: OrderStatus | null;
  channel?: OrderChannel | null;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

export interface OrderStats {
  nuevo: number;
  preparando: number;
  enviado: number;
  entregado: number;
  total: number;
  mercadolibre: number;
  wix: number;
}

// ============================================
// API RESPONSES (RAW)
// ============================================

// Mercado Libre
export interface MLOrder {
  id: number;
  pack_id?: number | null;
  shipping?: { id: number };
  date_created: string;
  date_closed: string;
  total_amount: number;
  paid_amount: number;
  currency_id: string;
  buyer: {
    id: number;
    nickname: string;
  };
  order_items: Array<{
    item: {
      id: string;
      title: string;
      seller_sku: string;
      variation_attributes?: Array<{
        name: string;
        value_name: string;
      }>;
    };
    quantity: number;
    unit_price: number;
    full_unit_price: number;
    currency_id: string;
  }>;
  payments?: Array<{
    payment_method_id: string;
    status: string;
    installments: number;
    total_paid_amount: number;
    date_approved: string;
  }>;
  tags?: string[];
  status: string;
}

// Wix
export interface WixOrder {
  _id: string;
  number: string;
  _createdDate: string;
  _updatedDate: string;
  currency: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  buyerInfo: {
    id: string;
    email: string;
  };
  billingInfo?: {
    contactDetails?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    };
  };
  shippingInfo?: {
    logistics?: {
      shippingDestination?: {
        address?: {
          addressLine?: string;
          addressLine2?: string;
          city?: string;
          subdivisionFullname?: string;
          subdivision?: string;
          countryFullname?: string;
          country?: string;
          postalCode?: string;
        };
        contactDetails?: {
          firstName?: string;
          lastName?: string;
          phone?: string;
        };
      };
    };
  };
  recipientInfo?: {
    address?: {
      addressLine?: string;
      addressLine2?: string;
      city?: string;
      subdivisionFullname?: string;
      subdivision?: string;
      countryFullname?: string;
      country?: string;
      postalCode?: string;
    };
    contactDetails?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    };
  };
  lineItems: Array<{
    id: string;
    sku?: string;
    productName?: {
      original: string;
      translated?: string;
    };
    quantity: number;
    price: { amount: string };
    priceBeforeDiscounts?: { amount: string };
    totalPriceAfterTax?: { amount: string };
    image?: {
      url: string;
    };
    physicalProperties?: {
      sku?: string;
    };
  }>;
  priceSummary: {
    subtotal: { amount: string };
    shipping: { amount: string };
    tax: { amount: string };
    total: { amount: string };
    totalPrice?: { amount: string };
  };
}
