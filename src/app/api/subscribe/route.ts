import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { name, email, phone } = await req.json();

        // 1. Intentar crear el lead en Neon
        const subscriber = await db.lead.create({
            data: { name, email, phone }
        });

        // 2. Si se creó con éxito, enviar correo de bienvenida
        await resend.emails.send({
            from: 'Equipo Pormucha <ventas@pormuchakombucha.com>',
            to: email,
            subject: '🌿 ¡Bienvenido a Pormucha!',
            html: `
                    <div style="background-color: #f4f1e9; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e6e6e6;">
                            
                            <div style="background-color: #d7d7c6ff; padding: 40px; text-align: center;">
                                <img src="https://pormuchakombucha.com/logo-white.png" alt="Pormucha Logo" style="width: 150px; height: auto;">
                            </div>

                            <div style="padding: 50px 40px; text-align: center;">
                                <h1 style="color: #1A1A1A; font-size: 28px; font-weight: bold; margin-bottom: 20px;">
                                    ¡Hola ${name}!
                                </h1>
                                
                                <p style="color: #868677ff; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
                                    Es un gusto darte la bienvenida a nuestra comunidad. Estamos fermentando algo increíble y tú eres de los primeros en asegurar su lugar en el lanzamiento.
                                </p>

                                <div style="background-color: #f4f1e9; padding: 20px; border-radius: 12px; margin-bottom: 40px;">
                                    <p style="color: #8B3A18; font-style: italic; font-size: 16px; margin: 0;">
                                        "Pormuchos momentos compartidos"
                                    </p>
                                </div>

                                <a href="https://pormuchakombucha.com" 
                                style="background-color: #1A1A1A; color: #ffffff; padding: 18px 35px; border-radius: 50px; text-decoration: none; font-weight: bold; letter-spacing: 1px; display: inline-block;">
                                    VISITAR NUESTRA WEB
                                </a>
                            </div>

                            <div style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                                <p style="color: #999999; font-size: 12px; margin: 0;">
                                    Este es un correo automático de Pormucha Kombucha.<br>
                                    
                                </p>
                            </div>
                        </div>
                    </div>
                `
        });

        return NextResponse.json(subscriber);

    } catch (error: any) {
        // 3. Manejar el error de correo duplicado (Código P2002 de Prisma)
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: "Este correo ya está registrado con nosotros." },
                { status: 400 }
            );
        }

        console.error("Error detallado:", error);
        return NextResponse.json({ error: "Error al suscribirse" }, { status: 500 });
    }
}