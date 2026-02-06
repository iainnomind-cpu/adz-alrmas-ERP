import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Mail, Lock, Unlock, Shield } from 'lucide-react';
import html2canvas from 'html2canvas';
import { DigitalCard as DigitalCardType, supabase } from '../../lib/supabase';

import cancologo from '../../assets/cancologo.png';

interface DigitalCardProps {
  card: DigitalCardType;
  usageCount: number;
  onBlock: (card: DigitalCardType) => void;
  onActivate: (card: DigitalCardType) => void;
}

// Helper to use direct DL links for Dropbox to avoid Redirect CORS issues
const getDropboxDirectLink = (url: string) => {
  return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('&raw=1', '');
};

export function DigitalCard({ card, usageCount, onBlock, onActivate }: DigitalCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Logo URLs - Using Direct DL links derived from the user's links
  // This helps bypass the 302 Redirect chain which often causes CORS failures in canvas
  const ADZ_LOGO_URL = getDropboxDirectLink("https://www.dropbox.com/scl/fi/wlcuc5qklr7crla4lzb1x/307215314_761347671938335_5536053975738741040_n.jpg?rlkey=o5qp6m6onmpwnmriq3ym1d72f&st=azxykjuf");

  // Use local asset for Canaco logo
  const CANACO_LOGO_URL = cancologo;

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setIsDownloading(true);
    try {
      const originalCard = cardRef.current;

      // Setup off-screen container FIRST with fixed dimensions
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.height = '504px'; // 800 / 1.586
      container.style.overflow = 'hidden';
      document.body.appendChild(container);

      // Clone the card
      const clone = originalCard.cloneNode(true) as HTMLElement;

      // CRITICAL: Remove containerType which html2canvas doesn't support
      clone.style.containerType = 'normal';
      clone.style.width = '800px';
      clone.style.height = '504px';
      clone.style.maxWidth = 'none';
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.borderRadius = '16px';

      container.appendChild(clone);

      // FIX: Targeted Layout Adjustments for Download
      // 1. Ensure name isn't cut off
      const nameEl = clone.querySelector('.download-card-name') as HTMLElement;
      if (nameEl) {
        nameEl.style.overflow = 'visible';
        nameEl.style.whiteSpace = 'nowrap';
        // Ensure color is solid for html2canvas
        nameEl.style.textShadow = 'none';

        // Adjust name font size
        const computedName = window.getComputedStyle(nameEl);
        const currentNameSize = parseFloat(computedName.fontSize);
        if (currentNameSize) {
          nameEl.style.fontSize = `${currentNameSize * 0.65}px`;
        }
      }

      // 2. Adjust card number size (often renders too big in canvas)
      const numEl = clone.querySelector('.download-card-number') as HTMLElement;
      if (numEl) {
        // Multiply font size by 0.55 to compensate for canvas rendering
        const computed = window.getComputedStyle(numEl);
        const currentSize = parseFloat(computed.fontSize);
        if (currentSize) {
          numEl.style.fontSize = `${currentSize * 0.55}px`;
        }
      }

      // 3. Adjust slogan size
      const sloganEl = clone.querySelector('.download-card-slogan') as HTMLElement;
      if (sloganEl) {
        const computed = window.getComputedStyle(sloganEl);
        const currentSize = parseFloat(computed.fontSize);
        if (currentSize) {
          sloganEl.style.fontSize = `${currentSize * 0.6}px`;
        }
      }

      // Copy canvas content (QR codes) manually
      const originalCanvases = originalCard.querySelectorAll('canvas');
      const cloneCanvases = clone.querySelectorAll('canvas');
      originalCanvases.forEach((orig, index) => {
        const dest = cloneCanvases[index];
        if (dest) {
          const ctx = dest.getContext('2d');
          if (ctx) {
            ctx.drawImage(orig, 0, 0);
          }
        }
      });

      // FIX: Targeted normalization for Gradient Elements to prevent "non-finite" errors.
      // We only freeze dimensions for elements with gradients, leaving flex layout mostly intact.
      const normalizeStyles = (element: HTMLElement) => {
        const computed = window.getComputedStyle(element);

        // 1. Fix Font Size (cqw units)
        const fontSize = computed.fontSize;
        if (fontSize && parseFloat(fontSize) > 0) {
          element.style.fontSize = fontSize;
        }

        // 2. Fix Letter Spacing
        if (computed.letterSpacing && computed.letterSpacing !== 'normal') {
          element.style.letterSpacing = computed.letterSpacing;
        }

        // 3. TARGETED FIX FOR GRADIENTS:
        // If an element has a gradient, we MUST give it explicit pixel dimensions
        // otherwise html2canvas fails to calculate bounds for addColorStop
        const bgImage = computed.backgroundImage;
        if (bgImage && bgImage.includes('gradient')) {
          const rect = element.getBoundingClientRect();
          // Force exact pixel size on gradient elements
          if (rect.width > 0 && rect.height > 0) {
            element.style.width = `${rect.width}px`;
            element.style.height = `${rect.height}px`;
            // Disable aspect-ratio to prevent conflict
            element.style.aspectRatio = 'auto';
          }
          // Ensure the gradient syntax is safe (inline)
          element.style.backgroundImage = bgImage;
        }

        // Recurse
        Array.from(element.children).forEach(child => {
          normalizeStyles(child as HTMLElement);
        });
      };

      normalizeStyles(clone);

      // Wait for images to load
      await new Promise<void>((resolve) => {
        const images = Array.from(clone.querySelectorAll('img'));
        if (images.length === 0) {
          resolve();
          return;
        }

        let loaded = 0;
        const checkDone = () => {
          loaded++;
          if (loaded >= images.length) resolve();
        };

        images.forEach(img => {
          if (img.complete) {
            checkDone();
          } else {
            img.onload = checkDone;
            img.onerror = checkDone;
          }
        });

        // Fallback timeout
        setTimeout(resolve, 2000);
      });

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: 800,
        height: 504,
        logging: false,
      });

      document.body.removeChild(container);

      const link = document.createElement('a');
      link.download = `ADZ-Card-${card.card_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading card:', error);
      alert('Error al descargar la tarjeta. Por favor intente de nuevo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmail = async () => {
    if (!cardRef.current) return;

    setSendingEmail(true);
    setEmailError(null);

    try {
      // Get customer email from database
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('email, name')
        .eq('id', card.customer_id)
        .single();

      if (customerError || !customerData?.email) {
        setEmailError('El cliente no tiene un email registrado');
        setSendingEmail(false);
        return;
      }

      // Generate card image (reuse download logic)
      const originalCard = cardRef.current;

      // Setup off-screen container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.height = '504px';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);

      // Clone the card
      const clone = originalCard.cloneNode(true) as HTMLElement;
      clone.style.containerType = 'normal';
      clone.style.width = '800px';
      clone.style.height = '504px';
      clone.style.maxWidth = 'none';
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.borderRadius = '16px';

      container.appendChild(clone);

      // Apply same fixes as download
      const nameEl = clone.querySelector('.download-card-name') as HTMLElement;
      if (nameEl) {
        nameEl.style.overflow = 'visible';
        nameEl.style.whiteSpace = 'nowrap';
        nameEl.style.textShadow = 'none';
        const computedName = window.getComputedStyle(nameEl);
        const currentNameSize = parseFloat(computedName.fontSize);
        if (currentNameSize) {
          nameEl.style.fontSize = `${currentNameSize * 0.65}px`;
        }
      }

      const numEl = clone.querySelector('.download-card-number') as HTMLElement;
      if (numEl) {
        const computed = window.getComputedStyle(numEl);
        const currentSize = parseFloat(computed.fontSize);
        if (currentSize) {
          numEl.style.fontSize = `${currentSize * 0.55}px`;
        }
      }

      const sloganEl = clone.querySelector('.download-card-slogan') as HTMLElement;
      if (sloganEl) {
        const computed = window.getComputedStyle(sloganEl);
        const currentSize = parseFloat(computed.fontSize);
        if (currentSize) {
          sloganEl.style.fontSize = `${currentSize * 0.6}px`;
        }
      }

      // Copy canvas content
      const originalCanvases = originalCard.querySelectorAll('canvas');
      const cloneCanvases = clone.querySelectorAll('canvas');
      originalCanvases.forEach((orig, index) => {
        const dest = cloneCanvases[index];
        if (dest) {
          const ctx = dest.getContext('2d');
          if (ctx) {
            ctx.drawImage(orig, 0, 0);
          }
        }
      });

      // Normalize styles for gradients
      const normalizeStyles = (element: HTMLElement) => {
        const computed = window.getComputedStyle(element);
        const fontSize = computed.fontSize;
        if (fontSize && parseFloat(fontSize) > 0) {
          element.style.fontSize = fontSize;
        }
        if (computed.letterSpacing && computed.letterSpacing !== 'normal') {
          element.style.letterSpacing = computed.letterSpacing;
        }
        const bgImage = computed.backgroundImage;
        if (bgImage && bgImage.includes('gradient')) {
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            element.style.width = `${rect.width}px`;
            element.style.height = `${rect.height}px`;
            element.style.aspectRatio = 'auto';
          }
          element.style.backgroundImage = bgImage;
        }
        Array.from(element.children).forEach(child => {
          normalizeStyles(child as HTMLElement);
        });
      };

      normalizeStyles(clone);

      // Wait for images to load
      await new Promise<void>((resolve) => {
        const images = Array.from(clone.querySelectorAll('img'));
        if (images.length === 0) {
          resolve();
          return;
        }
        let loaded = 0;
        const checkDone = () => {
          loaded++;
          if (loaded >= images.length) resolve();
        };
        images.forEach(img => {
          if (img.complete) {
            checkDone();
          } else {
            img.onload = checkDone;
            img.onerror = checkDone;
          }
        });
        setTimeout(resolve, 2000);
      });

      // Generate canvas
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: 800,
        height: 504,
        logging: false,
      });

      document.body.removeChild(container);

      // Convert canvas to base64
      const cardImage = canvas.toDataURL('image/png');

      // Send email via Edge Function
      const { data, error } = await supabase.functions.invoke('send-digital-card', {
        body: {
          cardId: card.id,
          customerEmail: customerData.email,
          customerName: customerData.name,
          cardNumber: card.card_number,
          cardImage: cardImage,
        }
      });

      if (error) throw error;

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailError('Error al enviar el correo. Intenta de nuevo.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-auto"> {/* CONSTRAINT: Max width for PREVIEW only */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div
          ref={cardRef}
          className="relative rounded-xl overflow-hidden shadow-2xl text-white font-sans select-none"
          style={{
            aspectRatio: '1.586/1',
            background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            containerType: 'inline-size', // Local context for cqw
            width: '100%'
          }}
        >
          {/* Background Texture */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")',
              backgroundSize: '4px 4px'
            }}
          />

          {/* Main Layout Layer */}
          <div className="relative z-10 w-full h-full flex flex-col p-[5%]">

            {/* Top Row: Logos */}
            <div className="flex justify-between items-start w-full">
              {/* Left: ADZ Logo */}
              <div className="flex flex-col items-start w-[45%]">
                <img
                  src={ADZ_LOGO_URL}
                  alt="ADZ Alarmas"
                  className="h-auto w-full max-w-[120px] object-contain drop-shadow-md bg-white/10 rounded px-1 max-h-[15%]"
                  crossOrigin="anonymous" // Try anonymous CORS with DL link
                />
                <span className="download-card-slogan text-[2.5cqw] tracking-[0.2em] font-light uppercase opacity-90 mt-1 drop-shadow-sm font-semibold leading-tight whitespace-nowrap">
                  Su seguridad de principio a fin
                </span>
              </div>

              {/* Right: Canaco Logo */}
              <div className="flex flex-col items-end w-[25%]">
                <img
                  src={CANACO_LOGO_URL}
                  alt="Canaco"
                  className="h-auto w-full object-contain drop-shadow-sm max-h-[12%]"
                  crossOrigin="anonymous"
                />
              </div>
            </div>

            {/* Middle Row: Chip */}
            <div className="flex-1 flex items-center pl-1">
              <div className="flex items-center gap-2 opacity-90">
                <div
                  className="w-[12%] aspect-[4/3] rounded border border-yellow-600/50 shadow-sm"
                  style={{ background: 'linear-gradient(to top right, #fef08a, #eab308)' }}
                />
                <Shield className="w-[8%] h-auto text-white/70" />
              </div>
            </div>

            {/* Bottom Row: Data + QR */}
            <div className="relative w-full h-[35%] flex items-end">

              {/* Text Content */}
              <div className="flex flex-col justify-end h-full w-[75%] pr-2 space-y-[2%]">
                {/* Card Number */}
                <div className="download-card-number text-[6cqw] font-mono font-bold tracking-widest text-shadow-sm leading-none whitespace-nowrap overflow-visible">
                  {card.card_number.match(/.{1,4}/g)?.join(' ') || card.card_number}
                </div>

                <div className="flex items-center gap-4 text-[2.5cqw] uppercase tracking-wide opacity-90">
                  <div>
                    <span className="block text-[2cqw] opacity-80 leading-tight">Vence</span>
                    <span className="font-semibold">12/30</span>
                  </div>
                  <div>
                    <span className="block text-[2cqw] opacity-80 leading-tight">Miembro</span>
                    <span className="font-semibold">2024</span>
                  </div>
                </div>

                <div className="download-card-name text-[4cqw] font-bold uppercase tracking-wider text-shadow-sm leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                  {card.cardholder_name}
                </div>

                <div className="text-[2.5cqw] font-medium tracking-wide text-yellow-100 leading-none">
                  {card.card_type === 'titular' ? 'CLIENTE PROTEGIDO' : 'FAMILIAR PROTEGIDO'}
                </div>
              </div>

              {/* QR Code */}
              <div className="absolute bottom-0 right-0 w-[22%] aspect-square bg-white p-1 rounded-md shadow-lg flex items-center justify-center">
                <div className="w-full h-full">
                  <QRCodeCanvas
                    value={JSON.stringify(card.qr_code_data)}
                    size={256}
                    style={{ width: '100%', height: '100%' }}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between text-sm text-gray-600 px-2 mt-4">
          <div>
            <span className="font-semibold">Usos:</span> {usageCount}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Descargar como imagen"
            >
              {isDownloading ? <span className="animate-spin">⌛</span> : <Download className="w-4 h-4" />}
              <span className="text-xs font-medium">Descargar</span>
            </button>
            <button
              onClick={handleEmail}
              disabled={sendingEmail || emailSent}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Enviar por email"
            >
              {sendingEmail ? (
                <span className="animate-spin">⌛</span>
              ) : emailSent ? (
                <span className="text-green-600">✓</span>
              ) : (
                <Mail className="w-4 h-4" />
              )}
            </button>
            {card.is_active ? (
              <button
                onClick={() => onBlock(card)}
                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                title="Bloquear tarjeta"
              >
                <Lock className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onActivate(card)}
                className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                title="Activar tarjeta"
              >
                <Unlock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!card.is_active && card.block_reason && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded mx-2 border border-red-100">
            <strong>Bloqueada:</strong> {card.block_reason}
          </div>
        )}

        {emailError && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded mx-2 mt-2 border border-red-100">
            <strong>Error:</strong> {emailError}
          </div>
        )}

        {emailSent && (
          <div className="text-xs text-green-600 bg-green-50 p-2 rounded mx-2 mt-2 border border-green-100">
            <strong>✓ Enviado:</strong> El correo fue enviado exitosamente
          </div>
        )}
      </div>
    </div>
  );
}
