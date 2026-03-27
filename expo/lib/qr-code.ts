import { Svg, Path, Rect } from 'react-native-svg';

// Simple QR code generator using SVG (basic implementation)
// For production, consider using a library like react-native-qrcode-svg

export interface QRCodeData {
  documentId: string;
  amount: number;
  currency: string;
  customerName: string;
  paymentLink?: string;
}

export function generateQRCodeData(data: QRCodeData): string {
  // Generate a payment link or data string for QR code
  const paymentData = {
    type: 'payment',
    documentId: data.documentId,
    amount: data.amount,
    currency: data.currency,
    customerName: data.customerName,
    timestamp: new Date().toISOString(),
  };
  
  return JSON.stringify(paymentData);
}

export function generatePaymentLink(documentId: string, baseUrl?: string): string {
  // Generate a shareable payment link
  const link = baseUrl || 'https://dreambig.app/pay';
  return `${link}/${documentId}`;
}

// Simple QR code pattern generator (basic implementation)
// For production, use a proper QR code library
export function generateQRCodePattern(data: string, size: number = 200): string {
  // This is a placeholder - in production, use react-native-qrcode-svg or similar
  // For now, return a data URL that can be used with an external QR code service
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}


