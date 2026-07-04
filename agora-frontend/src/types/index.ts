export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  price: number
  status: 'active' | 'inactive'
  categoryId: string
  supplierId: string
}

export interface OrderItem {
  productId: string
  quantity: number
  unitPrice: number
}

export interface Order {
  id: string
  cashierId: string
  total: number
  discount: number
  status: string
  createdAt: string
  items: OrderItem[]
}

body{
    background:var(--bg);
    color:var(--text);
    font-family:Inter,sans-serif;
}

button{
    font-family:inherit;
}

input{
    font-family:inherit;
}

*{
    transition:
        background .2s,
        color .2s,
        border-color .2s,
        box-shadow .2s;
}