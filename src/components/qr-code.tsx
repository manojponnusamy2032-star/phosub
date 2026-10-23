"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRCodeImage({ value, size = 240 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => { void QRCode.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: "M", color: { dark: "#17212b", light: "#ffffff" } }).then(setSrc); }, [size, value]);
  return src ? <img src={src} width={size} height={size} alt="QR code for this examination session" /> : <div className="animate-pulse bg-slate-100" style={{ width: size, height: size }} aria-label="Generating QR code" />;
}