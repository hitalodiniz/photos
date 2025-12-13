// components/GoogleApiLoader.tsx
"use client";

import Script from 'next/script';
import { useEffect, useState } from 'react';

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

// Declaração global (opcional aqui se já estiver no layout)
declare global {
    interface Window {
        gapi: any;
        google: any;
        onGoogleLibraryLoad: () => void;
    }
}

export default function GoogleApiLoader() {
    return (
        <>
            {/* 1. CARREGAMENTO DO GOOGLE GSI (Auth Client) */}
            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onLoad={() => {
                    gsiLoaded = true;
                    checkAndNotify();
                }}
            />

            {/* 2. Script para Google APIs (GAPI) - AGORA CARREGA TAMBÉM O MÓDULO DRIVE */}
            <Script
                src="https://apis.google.com/js/api.js"
                strategy="afterInteractive"
                onLoad={() => {
                    if (window.gapi) {
                        // Carrega o módulo Picker (necessário para o botão)
                        window.gapi.load('picker', () => {
                            // Carrega o módulo Client e Drive API (necessário para a consulta files.get)
                            window.gapi.load('client', () => {
                                window.gapi.client.load('drive', 'v3', () => {
                                    gapiLoaded = true;
                                    checkAndNotify(); // Dispara o sinal SÓ depois que TUDO carregar
                                });
                            });
                        });
                    }
                }}
            />
        </>
    );
}