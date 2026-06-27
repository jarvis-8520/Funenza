'use client';

import { useState } from 'react';

const WHATSAPP_NUMBER = '919999999999'; // Replace with real number
const EMAIL_ADDRESS   = 'hello@funenza.com'; // Replace with real email

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-6 h-6">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

const PacManIcon = () => (
  <svg viewBox="0 0 24 24" fill="#FFD700" className="w-7 h-7">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 0l10 5-10 5V2z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.24 11.36 11.36 0 003.55.57 1 1 0 011 1v3.61a1 1 0 01-1 1A19 19 0 013 5a1 1 0 011-1h3.61a1 1 0 011 1 11.36 11.36 0 00.57 3.55 1 1 0 01-.24 1.11l-2.2 2.2z" />
  </svg>
);

export default function FloatingContact() {
  const [open, setOpen] = useState(false);

    const buttons = [
      {
        label: 'Phone',
        icon: <PhoneIcon />,
        color: '#FF3B3B',
        href: 'tel:+919999999999',
        shadow: 'rgba(255,59,59,0.50)',
        delay: '0.05s',
      },
      {
        label: 'WhatsApp',
        icon: <WhatsAppIcon />,
        color: '#FFD700',
        href: `https://wa.me/${WHATSAPP_NUMBER}`,
        shadow: 'rgba(255,215,0,0.45)',
        delay: '0.12s',
      },
      {
        label: 'Email',
        icon: <EmailIcon />,
        color: '#3B8BFF',
        href: `mailto:${EMAIL_ADDRESS}`,
        shadow: 'rgba(59,139,255,0.50)',
        delay: '0.18s',
      },
    ];


  return (
    <>
      <style>{`
        @keyframes fabPop {
          0%   { transform: scale(0) translateY(12px); opacity: 0; }
          70%  { transform: scale(1.12) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes fabCollapse {
          0%   { transform: scale(1) translateY(0); opacity: 1; }
          100% { transform: scale(0) translateY(12px); opacity: 0; }
        }
        @keyframes pacmanSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ripple {
          0%   { box-shadow: 0 0 0 0 rgba(255,215,0,0.5); }
          100% { box-shadow: 0 0 0 18px rgba(255,215,0,0); }
        }
        .fab-btn-open {
          animation: fabPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .fab-btn-close {
          animation: fabCollapse 0.25s ease forwards;
        }
        .fab-main {
          animation: ripple 2s ease-out infinite;
        }
        .fab-item:hover {
          transform: scale(1.1) !important;
        }
      `}</style>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">

        {/* WhatsApp + Email buttons */}
        {buttons.map((btn, i) => (
          <a
            key={btn.label}
            href={btn.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={btn.label}
            className={`fab-item flex items-center justify-center w-14 h-14 rounded-full text-white transition-transform duration-200 ${
              open ? 'fab-btn-open' : 'fab-btn-close'
            }`}
            style={{
              backgroundColor: btn.color,
              boxShadow: `0 4px 20px ${btn.shadow}`,
              animationDelay: open ? btn.delay : '0s',
              pointerEvents: open ? 'auto' : 'none',
            }}
          >
            {btn.icon}
          </a>
        ))}

        {/* Main toggle button */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle contact options"
          className="fab-main flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 focus:outline-none"
          style={{
            backgroundColor: open ? '#FF6B00' : '#FFD700',
            boxShadow: `0 4px 24px ${open ? 'rgba(255,107,0,0.6)' : 'rgba(255,215,0,0.5)'}`,
            transform: open ? 'rotate(0deg)' : 'rotate(0deg)',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              color: open ? 'white' : '#0a0a14',
            }}
          >
            {open ? <CloseIcon /> : <PhoneIcon />}
          </span>
        </button>
      </div>
    </>
  );
}
