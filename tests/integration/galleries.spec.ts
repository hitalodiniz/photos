import { test, expect } from '@playwright/test';
import { GalleryPage } from '../pages/GalleryPage';
import { cleanupAndResetTrialState, injectTestGalleries } from '../utils/db-cleanup';

const USER_EMAIL = 'hitalodiniz80@gmail.com';

test.describe.serial('Domínio: Gestão de Galerias', () => {
  let galleryPage: GalleryPage;

  test.beforeEach(async ({ page }) => {
    galleryPage = new GalleryPage(page);
    // Mandatory: Clean database before each scenario. Start with PRO to allow creation.
    await cleanupAndResetTrialState(USER_EMAIL, { plan_key: 'PRO', keep_galleries: false });
    await galleryPage.gotoList();
    await page.reload(); // Sem networkidle para evitar timeouts de scripts de terceiros
  });

  test('Fluxo Feliz: Criação completa de galeria com dados válidos', async ({ page }) => {
    const title = `Galeria QA ${Date.now()}`;

    await test.step('Abrir formulário de criação', async () => {
      await galleryPage.gotoCreate();
    });

    await test.step('Preencher dados válidos', async () => {
      await galleryPage.fillForm({
        title,
        clientName: 'Cliente VIP',
        date: '2026-12-25',
        category: 'Ensaio Feminino'
      });
    });

    await test.step('Mock do Google Drive e Salvar', async () => {
       // Injeta valores diretamente nos inputs ocultos e dispara o submit em um único passo
       await page.evaluate(() => {
          const setVal = (name: string, val: string) => {
            const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
            if (input) {
              // Força o valor no elemento DOM
              input.value = val;
              // Não disparamos eventos para evitar que o React re-renderize
              // e sobrescreva o valor do DOM com o state vazio.
            }
          };
          
          setVal('drive_folder_id', 'mock-folder-123');
          setVal('drive_folder_name', 'Pasta Teste QA');
          setVal('photo_count', '10');
          // category is filled by fillForm via UI
          setVal('cover_image_url', 'mock-image-123');
          setVal('cover_image_ids', JSON.stringify(['mock-image-123']));
          
          // Importante: NÃO mockamos 'has_contracting_client' como 'CB' aqui,
          // porque preenchemos clientName com "Cliente VIP" no test.step anterior.
          // Se for 'CB' a API não espera clientName.
       });
       
       await galleryPage.save();
       
       // Log validation error if any
       try {
         const alert = await page.locator('[role="alert"]').first();
         await alert.waitFor({ state: 'visible', timeout: 2000 });
         console.log('TOAST ALERT TEXT:', await alert.innerText());
       } catch (e) {
         console.log('No toast alert appeared.');
       }
    });

    await test.step('Validar sucesso e listagem', async () => {
      // Espera o modal aparecer. O BaseModal usa h2 para o título.
      await galleryPage.expectCreatedSuccessfully();
      // Valida que o título está no corpo do modal
      await expect(page.locator('strong').filter({ hasText: title })).toBeVisible();
    });
  });

  test('Dados Inválidos: Validação de campos obrigatórios vazios', async () => {
    await test.step('Tentar criar galeria com campos vazios', async () => {
      await galleryPage.gotoCreate();
      await galleryPage.fillForm({ title: '', clientName: '', date: '' });
      await galleryPage.save();
    });

    await test.step('Validar mensagens de erro na UI', async () => {
      await galleryPage.expectValidationError();
    });
  });

  test('Validações de Limite: Bloqueio ao exceder 3 galerias no plano FREE', async ({ page }) => {
    await test.step('Configurar usuário como FREE com 3 galerias existentes', async () => {
      await cleanupAndResetTrialState(USER_EMAIL, { plan_key: 'FREE', keep_galleries: false });
      await injectTestGalleries(USER_EMAIL, 3);
      await page.goto('/dashboard');
      await page.reload();
    });

    await test.step('Acionar tentativa de criação', async () => {
      const novaGaleriaBtn = page.locator('button:has-text("Nova Galeria")');
      if (await novaGaleriaBtn.isDisabled()) {
        await page.click('text=Limite atingido — Upgrade');
      } else {
        await galleryPage.gotoCreate();
      }
    });

    await test.step('Validar que o modal de Limite Atingido apareceu', async () => {
      await galleryPage.expectLimitReached();
    });
  });

  test('Dados Inválidos: Acessar slug de galeria que não existe', async () => {
    await test.step('Navegar para rota de galeria inexistente', async () => {
      await galleryPage.gotoGallery('rota-fantasma-123');
    });

    await test.step('Validar estado 404', async () => {
      await galleryPage.expectNotFound();
    });
  });

  test('Ações de Galeria: Alternar status público/privado', async ({ page }) => {
    await test.step('Criar galeria base para teste de status', async () => {
       await injectTestGalleries(USER_EMAIL, 1);
       await page.goto('/dashboard');
       await page.reload();
    });

    await test.step('Abrir opções e alternar status', async () => {
       // O título injetado é "Galeria Injetada 1"
       await galleryPage.openGalleryOptions('Galeria Injetada 1');
       await galleryPage.togglePublicStatus();
    });

    await test.step('Validar alteração visual de status', async () => {
       // Verifica se apareceu algum botão confirmando a mudança ou se o status mudou no card
       const statusBadge = page.locator('text=Privada, text=Pública').first();
       await expect(statusBadge).toBeVisible();
    });
  });
});
