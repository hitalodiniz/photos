// mocks/data.ts

interface MockGaleriaData {
    id: string;
    title: string;
    clientName: string;
    location: string | null;
    date: Date | string;
    isPublic: boolean;
    password: string;
    driveFolderId: string;
}

interface MockPhotoItem {
    id: string;
    name: string;
    optimizedUrl: string; 
    width: number;
    height: number;
}

export const mockGaleriaPrivada: MockGaleriaData = {
    id: "g-123",
    title: "Casamento de Maria & João",
    clientName: "Maria e João Silva",
    location: "Fazenda Santa Cruz, MG",
    date: new Date('2025-12-05'),
    isPublic: false,
    password: "senha123",
    driveFolderId: "drive-id-casamento"
};

export const mockGaleriaPublica: MockGaleriaData = {
    ...mockGaleriaPrivada,
    title: "Batizado do Lucas",
    clientName: "Família Oliveira",
    location: "Igreja Nossa Senhora",
    date: new Date('2025-11-20'),
    isPublic: true,
    password: ""
};

export const mockPhotos: MockPhotoItem[] = [
    { id: "p1", name: "Cerimônia 01", optimizedUrl: "https://via.placeholder.com/1200x800/d3d3d3/555555?text=Foto+1", width: 1200, height: 800 },
    { id: "p2", name: "Noivos", optimizedUrl: "https://via.placeholder.com/800x1200/c0c0c0/555555?text=Foto+2", width: 800, height: 1200 },
    { id: "p3", name: "Festa", optimizedUrl: "https://via.placeholder.com/1600x1000/a9a9a9/555555?text=Foto+3", width: 1600, height: 1000 },
    { id: "p4", name: "Detalhe", optimizedUrl: "https://via.placeholder.com/900x600/808080/555555?text=Foto+4", width: 900, height: 600 },
    { id: "p5", name: "Retrato", optimizedUrl: "https://via.placeholder.com/1000x1500/778899/555555?text=Foto+5", width: 1000, height: 1500 },
];