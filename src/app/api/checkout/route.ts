import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
// Importe seu middleware ou lógica de autenticação aqui
// import { getServerSession } from "next-auth"; 

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();

    // 1. Validar se o priceId foi enviado
    if (!priceId) {
      return NextResponse.json({ error: "Price ID é obrigatório" }, { status: 400 });
    }

    // 2. Simulação de obtenção do usuário (Substitua pela sua lógica de Auth)
    // const session = await getServerSession();
    // const customerEmail = session?.user?.email;
    const customerEmail = "cliente@exemplo.com"; 

    // 3. Criar a Sessão de Checkout no Stripe
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/planos?canceled=true`,
      customer_email: customerEmail,
      // Metadata permite identificar o usuário no Webhook depois
      metadata: {
        userId: "ID_DO_USUARIO_NO_SEU_BANCO",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Erro no Stripe Checkout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}