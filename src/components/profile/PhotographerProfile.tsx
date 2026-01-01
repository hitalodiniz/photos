'use client';
import React from 'react';
import {
  Instagram,
  MessageCircle,
  MapPin,
  Share2,
  User as UserIcon,
} from 'lucide-react';
import {
  Footer,
  EditorialHeader,
  DynamicHeroBackground,
} from '@/components/layout';
import Image from 'next/image';
import { profile } from 'console';
import PhotographerProfileContent from '../ui/PhotographerProfileContent';

interface PhotographerProfileProps {
  fullName: string;
  username: string;
  miniBio: string;
  phone: string;
  instagram: string;
  photoPreview: string | null;
  cities: string[];
  showBackButton?: boolean;
}

export default function PhotographerProfile({
  fullName,
  username,
  miniBio,
  phone,
  instagram,
  photoPreview,
  cities,
}: PhotographerProfileProps) {
  return (
    <PhotographerProfileContent
      fullName={fullName}
      username={username}
      miniBio={miniBio}
      phone={phone}
      instagram={instagram}
      photoPreview={photoPreview}
      cities={cities}
      showBackButton={true}
    />
  );
}
