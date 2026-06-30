"use client";

// 장바구니 (클라이언트 localStorage) — 설정한 맞춤 상품을 주문 단계까지 유실 없이 전달한다.

import { createOrderItem } from "@/lib/order";
import type { FurnitureInput, OrderItemInput, ProductType } from "@/lib/types";

const CART_KEY = "teck_cart_v1";

function read(): OrderItemInput[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OrderItemInput[]) : [];
  } catch {
    return [];
  }
}

function write(items: OrderItemInput[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("teck-cart-change"));
  } catch {
    // 저장 실패는 무시 (용량 초과 등)
  }
}

export function getCart(): OrderItemInput[] {
  return read();
}

export function setCart(items: OrderItemInput[]) {
  write(items);
}

export function clearCart() {
  write([]);
}

/** 현재 설정한 맞춤 상품을 장바구니에 담는다. */
export function addConfiguredItem(
  productType: ProductType,
  name: string,
  input: FurnitureInput,
  quantity = 1,
  meta?: { order_verdict?: OrderItemInput["order_verdict"]; checklist_confirmations?: string[] },
): OrderItemInput {
  const item: OrderItemInput = { ...createOrderItem(productType, quantity), name, input, ...meta };
  write([...read(), item]);
  return item;
}
