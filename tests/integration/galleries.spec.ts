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
        const form = document.querySelector(
          'form#galeria-form',
        ) as HTMLFormElement | null;
        if (!form) throw new Error('Formulário galeria-form não encontrado');

        const setHidden = (name: string, val: string) => {
          const input = form.querySelector(
            `input[name="${name}"]`,
          ) as HTMLInputElement | null;
          if (!input) throw new Error(`Input hidden nao encontrado: ${name}`);

          // Usa o setter nativo para garantir que o valor seja definido
          const nativeSetter =
            Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value',
            )?.set;
          nativeSetter?.call(input, val);
          input.setAttribute('value', val); // Garante que o atributo também seja atualizado

          // Dispara eventos para o React notar a mudança e o hook-form validar corretamente
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        // Dados essenciais que o formulário valida no handleSubmit
        setHidden('drive_folder_id', 'mock-folder-123');
        setHidden('drive_folder_name', 'Pasta Teste QA');
        setHidden('photo_count', '10');
        setHidden('cover_image_url', 'mock-image-123');
        setHidden('cover_image_ids', JSON.stringify(['mock-image-123']));
        setHidden('category', 'Ensaio Feminino'); // Explicitamente define a categoria
        setHidden('has_contracting_client', 'CT'); // Cliente VIP implica 'CT' (com contratante)

        // Submete o formulário diretamente após a injeção dos valores
        form.submit();
      });

      // Log de erro se o toast aparecer (ajuda a diagnosticar qual validacao falhou)
      try {
        const alert = page.locator('[role="alert"]').first();
        if (await alert.isVisible({ timeout: 5000 })) {
          console.log('TOAST DETECTADO:', await alert.innerText());
        } else {
          console.log('Nenhum toast detectado após save.');
        }
      } catch (e) {
        console.log('Erro ao tentar detectar toast:', e);
      }

      // Adicionando um screenshot e dump do DOM para depuração
      await page.screenshot({ path: 'tests/screenshots/before-save-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('tests/screenshots/dom-dump-before-save.html', html);
      console.log('Screenshot e DOM dump salvos para depuração.');

      // Verifica por mensagens de erro visíveis na página (não apenas toasts)
      const visibleError = page.locator(':visible').filter({ hasText: /obrigatório|selecione|preencha|inválido/i });
      if (await visibleError.isVisible({ timeout: 2000 })) {
          console.log('ERRO DE VALIDAÇÃO VISÍVEL NA PÁGINA:', await visibleError.innerText());
      } else {
          console.log('Nenhum erro de validação visível na página.');
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
    await test.step('Configurar usuário como FREE e criar galerias até o hard cap', async () => {
      await cleanupAndResetTrialState(USER_EMAIL, { plan_key: 'FREE', keep_galleries: false });

      const createMockGallery = async (idx: number) => {
        const title = `Galeria Limite ${idx + 1} ${Date.now()}`;
        const driveFolderId = `mock-folder-${Date.now()}-${idx}`;

        await galleryPage.gotoCreate();
        await galleryPage.fillForm({
          title,
          clientName: 'Cliente VIP',
          date: '2026-12-25',
          category: 'Ensaio Feminino',
        });

        // Injeta valores diretamente nos inputs ocultos e dispara o submit em um único passo
        await page.evaluate(
          ({
            idxLocal,
            driveId,
          }: {
            idxLocal: number;
            driveId: string;
          }) => {
            const form = document.querySelector(
              'form#galeria-form',
            ) as HTMLFormElement | null;
            if (!form) throw new Error('Formulário galeria-form não encontrado');

            const setHidden = (name: string, val: string) => {
              const input = form.querySelector(
                `input[name="${name}"]`,
              ) as HTMLInputElement | null;
              if (!input) throw new Error(`Input hidden nao encontrado: ${name}`);

              // Usa o setter nativo para garantir que o valor seja definido
              const nativeSetter =
                Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype,
                  'value',
                )?.set;
              nativeSetter?.call(input, val);
              input.setAttribute('value', val); // Garante que o atributo também seja atualizado

              // Dispara eventos para o React notar a mudança e o hook-form validar corretamente
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            };

            // Dados essenciais que o formulário valida no handleSubmit
            setHidden('drive_folder_id', driveId);
            setHidden('drive_folder_name', 'Pasta Teste QA');
            setHidden('photo_count', '10');
            setHidden('cover_image_url', 'mock-image-123');
            setHidden('cover_image_ids', JSON.stringify([`mock-image-${idxLocal}`]));
            setHidden('category', 'Ensaio Feminino'); // Explicitamente define a categoria
            setHidden('has_contracting_client', 'CT'); // Cliente VIP implica 'CT' (com contratante)

            // Dispara eventos para o React notar a mudança e o hook-form validar corretamente
            const formInputs = form.querySelectorAll('input[type="hidden"][name]');
            formInputs.forEach(input => {
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            });
          },
          { idxLocal: idx, driveId: driveFolderId },
        );

        // Pequena espera para o React processar os eventos antes de verificar ou submeter
        await page.waitForTimeout(500);

        // Validacao rapida: confirmar que o FormData vai ler o valor injetado
        const injectedDriveId = await page.evaluate((driveId: string) => {
          const form = document.querySelector(
            'form#galeria-form',
          ) as HTMLFormElement | null;
          const input = form?.querySelector(
            'input[name="drive_folder_id"]',
          ) as HTMLInputElement | null;
          return input?.value ?? '';
        }, driveFolderId);
        if (injectedDriveId !== driveFolderId) {
          throw new Error(
            `Falha ao injetar drive_folder_id. Valor atual: ${injectedDriveId}`,
          );
        }

        await galleryPage.save();
        await galleryPage.expectCreatedSuccessfully();

        // Volta para o dashboard fechando o modal de sucesso
        await page.getByRole('button', { name: /Espaço de Galerias/i }).click();
        await expect(page).toHaveURL(/\/dashboard\/?(\?|$)/);
        // Evita reload enquanto a rota pode estar redirecionando.
        await page.goto('/dashboard');
      };

      // Para o FREE hard cap de galerias é 3: criamos 3 galerias
      for (let i = 0; i < 3; i++) {
        await createMockGallery(i);
      }
    });

    await test.step('Abrir UpgradeModal via SidebarStorage', async () => {
      const limitBtn = page
        .locator('aside')
        .locator('button')
        .filter({ hasText: /Limite atingido/i })
        .first();

      await expect(limitBtn).toBeVisible({ timeout: 15000 });
      await limitBtn.click();
    });

    await test.step('Validar que o modal de Limite Atingido apareceu', async () => {
      await galleryPage.expectLimitReached();
    });
  });

  test('Dados Inválidos: Acessar slug de galeria que não existe', async ({ page }) => {
    await test.step('Navegar para rota de galeria inexistente', async () => {
      // Supõe que /dashboard/galerias/id-inexistente retorne 404
      await galleryPage.gotoGallery('id-inexistente-total-999');
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
      // Vamos esperar ela aparecer primeiro
      await expect(page.locator('text=Galeria Injetada 1').first()).toBeVisible({ timeout: 10000 });
      await galleryPage.openGalleryOptions('Galeria Injetada 1');
      await galleryPage.togglePublicStatus();
    });

    await test.step('Validar alteração visual de status', async () => {
      // Procura por algum texto confirmando que mudou ou badge no card
      await expect(page.locator('text=Privada, text=Pública, text=Sucesso').first()).toBeVisible({ timeout: 15000 });
    });
  });
});
