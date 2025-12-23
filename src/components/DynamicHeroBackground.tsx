'use client';
import React, { useState, useEffect } from 'react';

const heroImages = [
  '/hero-bg-1.jpg', '/hero-bg-2.jpg', '/hero-bg-3.jpg',
  '/hero-bg-4.jpg', '/hero-bg-5.jpg', '/hero-bg-6.jpg',
  '/hero-bg-7.jpg', '/hero-bg-8.jpg', '/hero-bg-9.jpg',
  '/hero-bg-10.jpg', '/hero-bg-11.jpg', '/hero-bg-12.jpg'
];

export default function DynamicHeroBackground() {
  const [bgImage, setBgImage] = useState('');

  useEffect(() => {
    // Seleção aleatória da imagem ao montar o componente
    const randomIndex = Math.floor(Math.random() * heroImages.length);
    const selectedImage = heroImages[randomIndex];
    
    // Pré-carregamento para evitar "pulo" visual
    const img = new Image();
    img.src = selectedImage;
    img.onload = () => setBgImage(selectedImage);
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-1000"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.9) 100%), url('${bgImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: '50% 30%',
          opacity: bgImage ? 1 : 0
        }}
      />
    </div>
  );
}