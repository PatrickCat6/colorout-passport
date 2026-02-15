'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function BadgeContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [badgeSvg, setBadgeSvg] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    if (code) {
      fetchPassport();
    }
  }, [code]);

  const fetchPassport = async () => {
    try {
      const response = await fetch(`/api/get-passport?code=${code}`);
      const result = await response.json();

      if (result.success && result.passport) {
        setPassport(result.passport);
        generateBadge(result.passport);
      }
    } catch (error) {
      console.error('Error fetching passport:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBadge = async (passportData) => {
    try {
      const response = await fetch('/api/generate-badge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          holderName: passportData.holder_name,
          passportCode: passportData.code,
          city: passportData.city,
          date: passportData.date
        })
      });

      const result = await response.json();
      if (result.success) {
        setBadgeSvg(result.svg);
      }
    } catch (error) {
      console.error('Error generating badge:', error);
    }
  };

  const downloadBadge = () => {
    if (!badgeSvg || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 1080;
      canvas.height = 1920;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ColorOut-Passport-${passport.code}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };

    const svgBlob = new Blob([badgeSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  };

  const shareBadge = async () => {
    if (!badgeSvg || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = async () => {
      canvas.width = 1080;
      canvas.height = 1920;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (navigator.share) {
          try {
            const file = new File([blob], `ColorOut-Passport-${passport.code}.png`, { type: 'image/png' });
            await navigator.share({
              files: [file],
              title: 'My ColorOut™ Passport',
              text: `Check out my authenticated ColorOut™ tattoo! Code: ${passport.code}`
            });
          } catch (error) {
            console.error('Error sharing:', error);
            downloadBadge();
          }
        } else {
          downloadBadge();
        }
      }, 'image/png');
    };

    const svgBlob = new Blob([badgeSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!passport) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4">Passport not found</h1>
          <a href="/" className="text-purple-500 hover:underline">Go to home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-light mb-4">
            <span 
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: 'linear-gradient(to right, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF)',
              }}
            >
              ColorOut™
            </span>
          </h1>
          <p className="text-gray-400 font-bold">Instagram Badge</p>
        </div>

  {badgeSvg && (
  <div className="w-full max-w-md mx-auto px-4">
    <div 
      className="w-full bg-black rounded-lg overflow-hidden shadow-2xl mb-8"
      style={{ aspectRatio: '9/16' }}
    >
      <div 
        className="w-full h-full"
        style={{ 
          transform: 'scale(1)',
          transformOrigin: 'top center'
        }}
        dangerouslySetInnerHTML={{ __html: badgeSvg }}
      />
    </div>

            <div className="space-y-4">
              <button
                onClick={shareBadge}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 px-6 rounded-lg font-medium hover:opacity-90 transition"
              >
                📱 Share to Instagram Stories
              </button>

              <button
                onClick={downloadBadge}
                className="w-full border-2 border-purple-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-purple-600/10 transition"
              >
                💾 Download Badge
              </button>

              <div className="text-center text-gray-500 text-sm mt-8">
                <p>Share your ColorOut™ passport on Instagram</p>
                <p className="mt-2">Tag <span className="text-purple-500">@patrickcat_art</span></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BadgePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <BadgeContent />
    </Suspense>
  );
}
