import { useEffect, useState } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
}

export function QRCode({ value, size = 256 }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function generateQR() {
      try {
        const QRCodeLib = await import('qrcode');
        if (!mounted) return;

        const url = await QRCodeLib.toDataURL(value, {
          width: size,
          margin: 2,
        });

        if (mounted) {
          setDataUrl(url);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('QR generation failed'));
        }
      }
    }

    generateQR();

    return () => {
      mounted = false;
    };
  }, [value, size]);

  if (error) {
    return <div>QR code unavailable</div>;
  }

  if (!dataUrl) {
    return <div>Loading QR code...</div>;
  }

  return <img src={dataUrl} alt="QR Code" width={size} height={size} />;
}
