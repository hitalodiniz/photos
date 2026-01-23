// components/GoogleApiLoader.tsx
"use client";

import Script from 'next/script';
import { useEffect } from 'react';

// Variáveis para garantir que as libs são carregadas apenas uma vez
let gapiLoaded = false;
let gsiLoaded = false;

// Função que só avisa o componente do Picker quando AMBAS as libs estiverem prontas
const checkAndNotify = () => {
    // A função window.onGoogleLibraryLoad é escutada pelo GooglePickerButton.tsx
    if (gapiLoaded && gsiLoaded && window.onGoogleLibraryLoad) {
        window.onGoogleLibraryLoad();
    }
};

// Declaração global
declare global {
    interface Window {
        gapi: any;
        google: any;
        onGoogleLibraryLoad: (() => void) | undefined;
    }
}

export default function GoogleApiLoader() {
    useEffect(() => {
        // Verifica se as bibliotecas já estão carregadas
        const checkLibraries = () => {
            if (window.gapi && window.google && window.google.picker) {
                gapiLoaded = true;
                gsiLoaded = true;
                checkAndNotify();
            }
        };

        // Verifica imediatamente
        checkLibraries();

        // Verifica periodicamente (fallback)
        const interval = setInterval(() => {
            if (!gapiLoaded || !gsiLoaded) {
                checkLibraries();
            } else {
                clearInterval(interval);
            }
        }, 500);

        return () => clearInterval(interval);
    }, []);

    // 🎯 DEBUG: Log de diagnóstico em produção
    useEffect(() => {
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
            // console.log('[GoogleApiLoader] Status:', {
            //     gapiLoaded,
            //     gsiLoaded,
            //     hasGapi: !!window.gapi,
            //     hasGoogle: !!window.google,
            //     hasPicker: !!(window.google && window.google.picker),
            // });
        }
    }, [gapiLoaded, gsiLoaded]);

    return (
        <>
            {/* 1. CARREGAMENTO DO GOOGLE GSI (Auth Client) */}
            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onLoad={() => {
                    gsiLoaded = true;
                    // console.log('[GoogleApiLoader] Google GSI loaded');
                    checkAndNotify();
                }}
                onError={(e) => {
                    console.error('[GoogleApiLoader] Failed to load Google GSI', e);
                }}
            />

            {/* 2. Script para Google APIs (GAPI) - CARREGA O MÓDULO PICKER */}
            <Script
                src="https://apis.google.com/js/api.js"
                strategy="afterInteractive"
                onLoad={() => {
                    if (window.gapi) {
                        // Carrega o módulo Picker (necessário para o botão)
                        window.gapi.load('picker', () => {
                            // console.log('[GoogleApiLoader] Google Picker API loaded');
                            gapiLoaded = true;
                            checkAndNotify();
                        });
                    }
                }}
                onError={(e) => {
                    console.error('[GoogleApiLoader] Failed to load Google API', e);
                }}
            />
        </>
    );
}