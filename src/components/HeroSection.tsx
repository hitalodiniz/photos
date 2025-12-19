'use client';
import React, { useState, useEffect } from 'react';
import { Camera, MapPin } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';

export default function HeroSection() {
  // 1. Array com os nomes exatos dos arquivos da sua pasta pública
  const heroImages = [
    '/hero-bg-1.jpg', '/hero-bg-2.jpg', '/hero-bg-3.jpg',
    '/hero-bg-4.jpg', '/hero-bg-5.jpg', '/hero-bg-6.jpg',
    '/hero-bg-7.jpg', '/hero-bg-8.jpg', '/hero-bg-9.jpg',
    '/hero-bg-10.jpg', '/hero-bg-11.jpg', '/hero-bg-12.jpg'
  ];

  // 2. Estado para armazenar a imagem sorteada
  const [bgImage, setBgImage] = useState('/hero-bg-1.jpg');

  // 3. Lógica para sortear a foto ao carregar a página
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * heroImages.length);
    setBgImage(heroImages[randomIndex]);
  }, []);

  return (

  );
}