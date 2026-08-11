import { db } from "@/lib/db";

export type WebCmsBlockType = "hero" | "content" | "media" | "cta" | "faq";

export type WebCmsBlock = {
  id: string;
  type: WebCmsBlockType;
  label: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  videoUrl: string;
  buttonLabel: string;
  buttonHref: string;
  isVisible: boolean;
  order: number;
};

export type WebCmsPage = {
  key: string;
  route: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
  blocks: WebCmsBlock[];
};

export type WebCmsConfig = {
  version: 1;
  updatedAt: string;
  pages: WebCmsPage[];
};

const PAGE_DEFS: Array<Pick<WebCmsPage, "key" | "route" | "title" | "description" | "seoTitle" | "seoDescription">> = [
  {
    key: "home",
    route: "/home",
    title: "Inicio / Landing",
    description: "Portada principal con hero, sabores destacados y confianza.",
    seoTitle: "Pormucha | Inicio",
    seoDescription: "Portada principal del sitio con acceso a la tienda, suscripciones y contenido de marca.",
  },
  {
    key: "prelaunch",
    route: "/",
    title: "Prelanzamiento",
    description: "Página de expectativa y captación previa al lanzamiento oficial.",
    seoTitle: "Pormucha | Prelanzamiento",
    seoDescription: "Página de pre-lanzamiento con video, mensaje principal y formulario de suscripción.",
  },
  {
    key: "landing",
    route: "/landing",
    title: "Landing",
    description: "Página de conversión para campañas o anuncios.",
    seoTitle: "Pormucha | Landing",
    seoDescription: "Landing de marketing para captar tráfico y convertir visitas en ventas o suscripciones.",
  },
  {
    key: "nosotros",
    route: "/nosotros",
    title: "Nosotros",
    description: "Historia, proceso y propuesta de valor de la marca.",
    seoTitle: "Pormucha | Nosotros",
    seoDescription: "Página institucional para contar la historia, misión y calidad de la marca.",
  },
  {
    key: "tienda",
    route: "/tienda",
    title: "Tienda",
    description: "Catálogo comercial para packs y sabores.",
    seoTitle: "Pormucha | Tienda",
    seoDescription: "Catálogo de productos, packs y sabores para compra directa.",
  },
  {
    key: "suscripciones",
    route: "/suscripciones",
    title: "Suscripciones",
    description: "Club Pormucha, beneficios y planes recurrentes.",
    seoTitle: "Pormucha | Suscripciones",
    seoDescription: "Sección de suscripciones con beneficios, descuentos y flujo recurrente.",
  },
  {
    key: "contacto",
    route: "/contacto",
    title: "Contacto",
    description: "Canales de contacto, soporte y ventas.",
    seoTitle: "Pormucha | Contacto",
    seoDescription: "Formulario y datos de contacto para atención al cliente y ventas.",
  },
  {
    key: "politica-privacidad",
    route: "/politica-de-privacidad",
    title: "Política de privacidad",
    description: "Aviso de privacidad y tratamiento de datos.",
    seoTitle: "Pormucha | Política de privacidad",
    seoDescription: "Aviso legal sobre el uso y resguardo de datos personales.",
  },
  {
    key: "politica-reembolso",
    route: "/politica-de-reembolso",
    title: "Política de reembolso",
    description: "Criterios de devoluciones y reembolsos.",
    seoTitle: "Pormucha | Política de reembolso",
    seoDescription: "Condiciones para devoluciones, reembolsos y reclamaciones.",
  },
  {
    key: "politica-envio",
    route: "/politica-de-envio",
    title: "Política de envío",
    description: "Cobertura, tiempos y proceso logístico.",
    seoTitle: "Pormucha | Política de envío",
    seoDescription: "Información oficial sobre envíos, paquetería y tiempos de entrega.",
  },
  {
    key: "politica-cancelacion",
    route: "/politica-de-cancelacion",
    title: "Política de cancelación",
    description: "Reglas para cancelaciones y cambios.",
    seoTitle: "Pormucha | Política de cancelación",
    seoDescription: "Lineamientos para cancelar pedidos, suscripciones y servicios.",
  },
  {
    key: "terminos-servicio",
    route: "/terminos-del-servicio",
    title: "Términos del servicio",
    description: "Condiciones generales de uso del sitio.",
    seoTitle: "Pormucha | Términos del servicio",
    seoDescription: "Términos y condiciones de uso de la web y sus servicios.",
  },
];

function createBlock(type: WebCmsBlockType, index: number, overrides: Partial<WebCmsBlock> = {}): WebCmsBlock {
  const base: WebCmsBlock = {
    id: crypto.randomUUID(),
    type,
    label: `${type.toUpperCase()} ${index + 1}`,
    title: "",
    subtitle: "",
    body: "",
    imageUrl: "",
    videoUrl: "",
    buttonLabel: "",
    buttonHref: "",
    isVisible: true,
    order: index + 1,
  };

  return { ...base, ...overrides };
}

function defaultBlocksForPage(pageKey: string): WebCmsBlock[] {
  switch (pageKey) {
    case "home":
      return [
        createBlock("hero", 0, {
          label: "Hero principal",
          title: "Pormucha",
          subtitle: "Kombucha",
          body: "Bebida fermentada naturalmente con probióticos vivos, ligera y refrescante.",
          buttonLabel: "Ir a la tienda",
          buttonHref: "/tienda",
          imageUrl: "/hero-bg.JPG",
          videoUrl: "/video-hero.mp4",
        }),
        createBlock("content", 1, {
          label: "Beneficios titulo",
          title: "Más que deliciosa, beneficiosa",
        }),
        createBlock("content", 2, {
          label: "Beneficio energia",
          title: "¡Aumenta tu energía!",
          body: "Con nutrientes orgánicos que revitalizan tu cuerpo y te mantienen en movimiento todo el día.",
        }),
        createBlock("content", 3, {
          label: "Beneficio defensas",
          title: "Fortalece tus defensas",
          body: "Repleta de antioxidantes que ayudan a proteger y fortalecer el sistema inmunológico natural.",
        }),
        createBlock("content", 4, {
          label: "Beneficio equilibrio",
          title: "Equilibra tu cuerpo",
          body: "Probióticos vivos que favorecen una digestión saludable y mantienen tu interior en sintonía.",
        }),
        createBlock("content", 5, {
          label: "Beneficio envios",
          title: "Envíos a todo México",
          body: "Llevamos el bienestar desde Campeche hasta la puerta de tu casa, de forma rápida y segura.",
        }),
        createBlock("media", 6, {
          label: "Sabores titulo",
          title: "Sabores Regulares",
          imageUrl: "/flavor-side.JPG",
          buttonLabel: "Ir a la tienda",
          buttonHref: "/tienda",
        }),
        createBlock("content", 7, {
          label: "Sabor Jamaica",
          title: "Jamaica",
          body: "Vibrante y refrescante. El sabor floral que amamos con el boost de probióticos.",
        }),
        createBlock("content", 8, {
          label: "Sabor Te Verde",
          title: "Té Verde",
          body: "Antioxidantes poderosos en cada sorbo. Suave, refrescante y lleno de beneficios.",
        }),
        createBlock("content", 9, {
          label: "Sabor Pina",
          title: "Piña",
          body: "Tropical y dulce natural. El sabor del paraíso en una botella fermentada con maestría.",
        }),
        createBlock("content", 10, {
          label: "Sabor Te Negro",
          title: "Té Negro",
          body: "Intenso y tradicional. Para los que buscan un sabor robusto con toda la potencia.",
        }),
        createBlock("content", 11, {
          label: "Instagram titulo",
          title: "Pormucha en Instagram",
          body: "Fermentación real. Bienestar cotidiano.",
        }),
        createBlock("media", 12, {
          label: "Instagram reel 1",
          title: "HECHA CON TIEMPO",
          body: "Pequeños lotes, procesos reales y respeto por la fermentación.",
          videoUrl: "/reel-1.mp4",
        }),
        createBlock("media", 13, {
          label: "Instagram reel 2",
          title: "VIVA POR DENTRO",
          body: "Fermentada naturalmente con cultivos vivos que acompañan tu digestión.",
          videoUrl: "/reel-2.mp4",
        }),
        createBlock("media", 14, {
          label: "Instagram reel 3",
          title: "LIGERA Y REFRESCANTE",
          body: "Bebida burbujeante, libre de sellos, sin azúcar añadida.",
          videoUrl: "/reel-3.mp4",
        }),
        createBlock("cta", 15, {
          label: "CTA final",
          title: "El ritual diario de",
          subtitle: "cuidar tu centro.",
          body: "Un estilo de vida",
          buttonLabel: "Conoce más sobre nosotros",
          buttonHref: "/nosotros",
        }),
        createBlock("cta", 16, {
          label: "Suscripcion",
          title: "Pormucha",
          subtitle: "Comunidad",
          body: "Pormuchos momentos compartidos",
          buttonLabel: "Suscribirme ahora",
          buttonHref: "#suscripcion",
        }),
      ];
    case "prelaunch":
      return [
        createBlock("hero", 0, {
          label: "Hero pre-lanzamiento",
          title: "Pormucha Kombucha",
          subtitle: "Pormucha · en vivo",
          body: "Estamos fermentando algo increíble. La frescura viva ahora en línea.",
          buttonLabel: "Ir a la tienda",
          buttonHref: "/tienda",
          imageUrl: "/hero-bg.JPG",
          videoUrl: "/video-hero.mp4",
        }),
        createBlock("content", 1, {
          label: "Beneficio de lanzamiento",
          title: "Queremos que seas el primero en probar la frescura.",
          body: "Registra tus datos y obtén un descuento especial el día de nuestra apertura en línea oficial.",
        }),
        createBlock("cta", 2, {
          label: "Formulario",
          title: "Suscríbete a Pormucha Comunidad",
          subtitle: "Pormuchos momentos compartidos",
          body: "Sé el primero en enterarte de nuevos sabores estacionales, beneficios para la salud y promociones exclusivas.",
          buttonLabel: "Suscribirme ahora",
          buttonHref: "#suscripcion",
        }),
      ];
    case "landing":
      return [
        createBlock("hero", 0, {
          label: "Hero de campaña",
          title: "Suscríbete y recibe tu kombucha cada mes",
          subtitle: "Landing pensada para anuncios, promociones o campañas temporales.",
          body: "Asegura tu dosis de probióticos sin preocuparte de volver a pedir.",
          buttonLabel: "Comprar ahora",
          buttonHref: "/suscripciones",
        }),
        createBlock("cta", 1, {
          label: "CTA secundario",
          title: "¿Necesitas ayuda para elegir?",
          body: "Cambia este bloque por una oferta, testimonio o incentivo adicional.",
          buttonLabel: "Ver suscripciones",
          buttonHref: "/suscripciones",
        }),
      ];
    case "nosotros":
      return [
        createBlock("hero", 0, {
          label: "Hero principal",
          title: "Nosotros",
          subtitle: "Nuestra Filosofía",
          body: "Fermentación viva, respeto por el tiempo y el compromiso de cuidar tu centro.",
          imageUrl: "/hero-nosotros.jpg",
        }),
        createBlock("content", 1, {
          label: "Que es Pormucha",
          title: "¿Qué es Pormucha?",
          body: "Pormucha no es solo una kombucha.\n\nEs una bebida hecha con fermentación real, tiempo y atención a cada detalle. No aceleramos procesos ni usamos atajos: dejamos que cada lote desarrolle su sabor de forma natural.\n\nNació en casa y hoy crece sin perder su esencia.\n\nTe gusta por el sabor...\nte quedas por cómo te hace sentir.",
        }),
        createBlock("content", 2, {
          label: "Diferencia titulo",
          title: "La Diferencia Pormucha",
          subtitle: "Nuestra esencia",
        }),
        createBlock("content", 3, {
          label: "Diferencia natural",
          title: "100% Natural",
          body: "Sin conservadores, sin azúcares refinadas ocultas, ni ingredientes que no puedas pronunciar.",
        }),
        createBlock("content", 4, {
          label: "Diferencia cultivos",
          title: "Cultivos Vivos",
          body: "Respetamos los tiempos de fermentación. Nuestra bebida no se pasteuriza, para asegurar que los probióticos lleguen vivos a ti.",
        }),
        createBlock("content", 5, {
          label: "Diferencia centro",
          title: "Cuidamos tu Centro",
          body: "Creemos firmemente que una digestión saludable es la clave del bienestar emocional e inmunológico.",
        }),
        createBlock("media", 6, {
          label: "Origen",
          title: "El Origen",
          subtitle: "¿Cómo empezó todo?",
          body: "Todo empezó en casa, en la cocina de mi mamá.\nElla buscaba algo diferente. Una bebida natural, refrescante y sin los excesos de azúcar que encontramos todos los días. Así comenzó a preparar sus primeros lotes de kombucha, de manera casera, con paciencia y mucho cuidado.\n\nCada persona que llegaba a la casa la probaba. Familia, amigos, conocidos... y siempre pasaba lo mismo: les sorprendía el sabor, cómo se sentían después de tomarla, y casi sin excepción le decían: “Esto lo tienes que vender.”. Lo que comenzó como algo hecho con amor para compartir, poco a poco se fue convirtiendo en algo más grande. Fuimos perfeccionando cada detalle, entendiendo el proceso, respetando la fermentación y manteniendo siempre la esencia de lo que empezó en casa.\n\nHoy, esa misma kombucha sigue naciendo del mismo lugar: la intención de compartir algo que se siente bien.\nPorque al final, esto nunca fue solo una bebida...\nes para muchos momentos compartidos.",
          imageUrl: "/hero-bg.JPG",
        }),
        createBlock("content", 7, {
          label: "Kombucha",
          title: "¿Qué es la Kombucha?",
          body: "La kombucha es un té fermentado milenario (originario de Asia) preparado a partir de té endulzado cultivado con una colonia simbiótica de bacterias y levaduras (SCOBY).\n\nDurante su proceso de fermentación, el SCOBY consume la mayor parte del azúcar, transformándola en ácidos orgánicos beneficiosos, antioxidantes, enzimas y burbujas naturales, dotándola de sus populares poderes reconstituyentes y protectores de la flora intestinal.",
        }),
        createBlock("content", 8, {
          label: "FAQ titulo",
          title: "Preguntas Frecuentes",
        }),
        createBlock("faq", 9, {
          label: "FAQ 1",
          title: "¿Por qué noto pequeños depósitos turbios al fondo de la botella?",
          body: "¡No te asustes, esa es la prueba de vida! Son pequeñas partículas de fibra y cultivos que continúan multiplicándose en la botella porque nuestro producto NO está pasteurizado. Sólo gira tu botella con suavidad para mezclarlos.",
        }),
        createBlock("faq", 10, {
          label: "FAQ 2",
          title: "¿Contiene alcohol?",
          body: "La kombucha tiene rastros mínimos de alcohol (por lo general menos del 0.5%) que se producen de manera natural durante cualquier tipo de fermentación. Podríamos decir que es comparable a los rastros que encontrarías en una fruta madura.",
        }),
        createBlock("faq", 11, {
          label: "FAQ 3",
          title: "¿Cuánta kombucha debo tomar al día?",
          body: "Si eres principiante y nunca has tomado probióticos, te recomendamos empezar con media botella al día, escuchando cómo responde tu estómago, e ir incrementando paulatinamente hasta una o más botellas enteras al día.",
        }),
        createBlock("faq", 12, {
          label: "FAQ 4",
          title: "¿Tengo que mantenerla refrigerada?",
          body: "¡Sí! Nuestra kombucha está viva. Si la dejas mucho tiempo sin refrigerar los cultivos seguirán fermentando el azúcar provocando una bebida con sabor ácido o avinagrado y mucha presión de gas.",
        }),
        createBlock("cta", 13, {
          label: "CTA tienda",
          title: "¿Estás listo para darle a tu cuerpo lo que necesita?",
          subtitle: "Haz la prueba",
          body: "Si todavía dudas, empieza a cuidar tu centro con nuestro \"Kit de Introducción\" directo a la puerta de tu casa.",
          imageUrl: "/section-call-action-buy.jpg",
          buttonLabel: "Ir a la Tienda",
          buttonHref: "/tienda",
        }),
        createBlock("content", 14, {
          label: "Contacto final",
          title: "¿Quieres charlar más?",
          body: "Si tienes dudas especiales, te interesa convertirte en un distribuidor, o simplemente quieres dejarnos algún comentario, envíanos un DM en Instagram o acércate a nuestra página de contacto.",
        }),
        createBlock("cta", 15, {
          label: "Contacto Instagram",
          buttonLabel: "@pormuchakombucha",
          buttonHref: "https://instagram.com/pormuchakombucha",
        }),
        createBlock("cta", 16, {
          label: "Contacto formulario",
          buttonLabel: "Formulario Web",
          buttonHref: "/contacto",
        }),
      ];
    case "tienda":
      return [
        createBlock("hero", 0, {
          label: "Portada tienda",
          title: "Arma tu Pack.",
          subtitle: "Exclusivo Online",
          body: "Selecciona desde 6 hasta 24 botellas del sabor de tu preferencia y llévalo directo a tu puerta.",
          imageUrl: "/hero-tienda.jpg",
          buttonLabel: "Ver opciones",
          buttonHref: "#packs",
        }),
        createBlock("content", 1, {
          label: "Garantia titulo",
          title: "Garantía Pormucha",
          subtitle: "Comunidad Pormucha",
          body: "\"Pormuchos momentos compartidos\"",
        }),
        createBlock("content", 2, {
          label: "Garantia texto",
          title: "100% Satisfacción",
          body: "Únete a nuestros clientes frecuentes. Si es tu primera vez probando Pormucha y no fue lo que esperabas, te damos un reembolso total.",
        }),
        createBlock("content", 3, {
          label: "Garantia punto 1",
          title: "Válido en tu primera compra.",
        }),
        createBlock("content", 4, {
          label: "Garantia punto 2",
          title: "Máximo una garantía por cliente registrado.",
        }),
        createBlock("content", 5, {
          label: "Garantia punto 3",
          title: "Aplica únicamente en el Pack de 6 (Degustación).",
        }),
        createBlock("content", 6, {
          label: "FAQ tienda titulo",
          title: "Sobre tu Orden",
          subtitle: "Resuelve tus dudas",
        }),
        createBlock("faq", 7, {
          label: "FAQ tienda 1",
          title: "¿Puedo elegir los sabores de mi caja?",
          body: "¡Claro que sí! Nuestros packs son 100% personalizables. Solo haz clic en la opción de tu pack preferido y arma tu combinación ideal (Piña, Jamaica, Té Verde o Té Negro) antes de agregarlo en tu carrito.",
        }),
        createBlock("faq", 8, {
          label: "FAQ tienda 2",
          title: "¿A dónde hacen envíos?",
          body: "Enviamos a toda la República y podrás seleccionar en la pantalla de pago qué paquetería te conviene más.",
        }),
        createBlock("faq", 9, {
          label: "FAQ tienda 3",
          title: "¿Tengo que refrigerar mis bebidas al llegar?",
          body: "Sí. Al ser una bebida viva y natural, es muy importante que en cuanto las recibas en la puerta de tu casa las metas a refrigeración para detener la fermentación y disfrutarlas bien frías.",
        }),
        createBlock("faq", 10, {
          label: "FAQ tienda 4",
          title: "¿Cómo funciona la garantía de satisfacción?",
          body: "La garantía de devolución aplica únicamente una vez por cliente.",
        }),
      ];
    case "suscripciones":
      return [
        createBlock("hero", 0, {
          label: "Hero suscripciones",
          title: "Suscripciones",
          subtitle: "Vitalidad en automático",
          body: "Asegura tu dosis de probióticos sin preocuparte de volver a pedir. Tu kombucha favorita, entregada mes con mes.",
          imageUrl: "/hero-bg.JPG",
        }),
        createBlock("content", 1, {
          label: "Habito titulo",
          title: "El hábito de la fermentación",
          subtitle: "¿Por qué de forma regular?",
        }),
        createBlock("content", 2, {
          label: "Habito automatico",
          title: "EN AUTOMÁTICO",
          body: "Nosotros nos acordamos por ti. Recibe tu caja cada mes exacto sin hacer un solo clic extra.",
        }),
        createBlock("content", 3, {
          label: "Habito resultados",
          title: "RESULTADOS REALES",
          body: "El consumo constante de kombucha es lo que realmente fortalece tu microbiota a largo plazo.",
        }),
        createBlock("content", 4, {
          label: "Habito precio",
          title: "PRECIO ESPECIAL",
          body: "Los miembros de la suscripción obtienen el mejor costo por botella y acceso prioritario a ediciones limitadas.",
        }),
        createBlock("content", 5, {
          label: "Club titulo",
          title: "Beneficios de pertenecer al Club Pormucha",
          subtitle: "Tu inversión a largo plazo",
        }),
        createBlock("content", 6, {
          label: "Compra unica titulo",
          title: "Compra Única",
        }),
        createBlock("content", 7, {
          label: "Compra unica 1",
          title: "Descuento por volumen",
        }),
        createBlock("content", 8, {
          label: "Compra unica 2",
          title: "10% Descuento extra",
        }),
        createBlock("content", 9, {
          label: "Compra unica 3",
          title: "Sabores exclusivos",
        }),
        createBlock("content", 10, {
          label: "Compra unica 4",
          title: "Reposición automática",
        }),
        createBlock("content", 11, {
          label: "Club pormucha titulo",
          title: "Membresía Club Pormucha",
          subtitle: "Mejor Valor",
        }),
        createBlock("content", 12, {
          label: "Club pormucha 1",
          title: "Descuento por volumen",
        }),
        createBlock("content", 13, {
          label: "Club pormucha 2",
          title: "10% Descuento extra SIEMPRE",
        }),
        createBlock("content", 14, {
          label: "Club pormucha 3",
          title: "Sabores de temporada exclusivos",
        }),
        createBlock("content", 15, {
          label: "Club pormucha 4",
          title: "Reposición totalmente automática",
        }),
        createBlock("content", 16, {
          label: "Club pormucha 5",
          title: "Cancelación libre de 1-clic",
        }),
        createBlock("content", 17, {
          label: "FAQ suscripciones titulo",
          title: "Preguntas Frecuentes",
          subtitle: "Resuelve tus dudas",
        }),
        createBlock("faq", 18, {
          label: "FAQ suscripciones 1",
          title: "¿Puedo cancelar mi suscripción cuando quiera?",
          body: "Sí, totalmente. Nuestras suscripciones no tienen plazos forzosos. Puedes gestionarlas desde tu panel y cancelarlas desde el portal de facturación de Stripe.",
        }),
        createBlock("faq", 19, {
          label: "FAQ suscripciones 2",
          title: "¿Cómo elijo qué sabores quiero cada mes?",
          body: "Desde tu panel puedes guardar la mezcla de sabores de tu próximo envío. Si no haces cambios, el sistema surtirá la última selección confirmada. Los cambios quedan abiertos hasta 5 días antes de la fecha programada de envío.",
        }),
        createBlock("faq", 20, {
          label: "FAQ suscripciones 3",
          title: "¿Cuándo se realiza el cobro de mi tarjeta?",
          body: "El cobro inicial se realiza justo al inscribirte. Los cobros posteriores se efectuarán automáticamente de forma mensual o quincenal (dependiendo de tu plan) el mismo día natural que tu primera compra. Usamos la tecnología segura de Stripe.",
        }),
        createBlock("faq", 21, {
          label: "FAQ suscripciones 4",
          title: "¿Hay envíos a todo México?",
          body: "Así es. Colaboramos con una red logística para asegurar que tu lote fresco y en perfectas condiciones llegue hasta la puerta de tu hogar, sin importar en qué estado de la república te encuentres.",
        }),
        createBlock("cta", 22, {
          label: "CTA suscripciones",
          title: "¿Aún no estás decidido?",
          subtitle: "Una pequeña probada",
          body: "Prueba nuestro Kit de Introducción y déjanos convencerte con cada burbuja de nuestra fermentación real.",
          buttonLabel: "Ver paquetes de tienda",
          buttonHref: "/tienda",
        }),
      ];
    case "contacto":
      return [
        createBlock("content", 0, {
          label: "Información de contacto",
          title: "Contáctanos",
          body: "Estamos para ayudarte para cualquier duda sobre el producto, tu suscripción y tu compra.",
        }),
      ];
    default:
      return [
        createBlock("content", 0, {
          label: "Contenido legal",
          title: PAGE_DEFS.find((page) => page.key === pageKey)?.title || "Contenido",
          body: "Actualiza este texto con la versión legal final de la página.",
        }),
      ];
  }
}

function contactFallbackBlocks(): WebCmsBlock[] {
  return [
    createBlock("hero", 0, {
      label: "Hero contacto",
      title: "Tienes dudas?",
      subtitle: "Contactanos.",
      body: "Estamos para ayudarte para cualquier duda sobre el producto, tu suscripcion y tu compra.",
    }),
    createBlock("content", 1, {
      label: "Instagram contacto",
      title: "Instagram",
      subtitle: "@pormuchakombucha",
      buttonHref: "https://instagram.com/pormuchakombucha",
    }),
    createBlock("content", 2, {
      label: "WhatsApp contacto",
      title: "WhatsApp de soporte",
      subtitle: "Haz clic para chatear",
      buttonHref: "https://wa.me/529810000000",
    }),
    createBlock("content", 3, {
      label: "Correo contacto",
      title: "Correo electronico",
      subtitle: "ventas@pormuchakombucha.com",
      buttonHref: "mailto:ventas@pormuchakombucha.com",
    }),
    createBlock("content", 4, {
      label: "Formulario contacto",
      title: "Enviar mensaje",
      body: "Te responderemos lo mas pronto posible.",
    }),
  ];
}

export function createDefaultWebCmsConfig(): WebCmsConfig {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    pages: PAGE_DEFS.filter((page) => page.key !== "landing").map((page) => ({
      ...page,
      isPublished: true,
      blocks: page.key === "contacto" ? contactFallbackBlocks() : defaultBlocksForPage(page.key),
    })),
  };
}

function normalizeBlock(block: Partial<WebCmsBlock>, fallbackIndex: number): WebCmsBlock {
  return {
    id: typeof block.id === "string" && block.id.trim() ? block.id : crypto.randomUUID(),
    type: block.type === "hero" || block.type === "content" || block.type === "media" || block.type === "cta" || block.type === "faq" ? block.type : "content",
    label: String(block.label || `Bloque ${fallbackIndex + 1}`),
    title: String(block.title || ""),
    subtitle: String(block.subtitle || ""),
    body: String(block.body || ""),
    imageUrl: String(block.imageUrl || ""),
    videoUrl: String(block.videoUrl || ""),
    buttonLabel: String(block.buttonLabel || ""),
    buttonHref: String(block.buttonHref || ""),
    isVisible: Boolean(block.isVisible ?? true),
    order: Number.isFinite(Number(block.order)) ? Number(block.order) : fallbackIndex + 1,
  };
}

function normalizePage(page: Partial<WebCmsPage> | undefined, fallback: WebCmsPage): WebCmsPage {
  const source = page ?? {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  const effectiveFallback = fallback.key === "contacto"
    ? { ...fallback, blocks: contactFallbackBlocks() }
    : fallback;
  const blocks = effectiveFallback.blocks.map((fallbackBlock, index) => {
    const matchingBlock = sourceBlocks.find((block) => block?.label === fallbackBlock.label);
    const indexedBlock = sourceBlocks[index]?.label === fallbackBlock.label ? sourceBlocks[index] : undefined;
    return matchingBlock ?? indexedBlock ?? fallbackBlock;
  });

  return {
    key: effectiveFallback.key,
    route: effectiveFallback.route,
    title: String(source.title || effectiveFallback.title),
    description: String(source.description || effectiveFallback.description),
    seoTitle: String(source.seoTitle || effectiveFallback.seoTitle),
    seoDescription: String(source.seoDescription || effectiveFallback.seoDescription),
    isPublished: Boolean(source.isPublished ?? effectiveFallback.isPublished),
    blocks: blocks
      .map((block, index) => normalizeBlock(block, index))
      .sort((a, b) => a.order - b.order),
  };
}

export function normalizeWebCmsConfig(value: unknown): WebCmsConfig {
  const fallback = createDefaultWebCmsConfig();
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Partial<WebCmsConfig> & { pages?: Partial<WebCmsPage>[] };
  const pagesByKey = new Map<string, Partial<WebCmsPage>>();
  for (const page of Array.isArray(raw.pages) ? raw.pages : []) {
    if (page?.key) pagesByKey.set(page.key, page);
  }

  return {
    version: 1,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : fallback.updatedAt,
    pages: fallback.pages.map((page) => normalizePage(pagesByKey.get(page.key), page)),
  };
}

export async function getWebCmsConfig(): Promise<WebCmsConfig> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: "web_cms" },
    });

    if (!setting?.value) {
      return createDefaultWebCmsConfig();
    }

    return normalizeWebCmsConfig(JSON.parse(setting.value));
  } catch {
    return createDefaultWebCmsConfig();
  }
}

export function resolveWebCmsAssetUrl(url: string) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("/")) return value;

  const bucket = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const s3Prefix = bucket && region ? `https://${bucket}.s3.${region}.amazonaws.com/` : "";
  const genericS3Pattern = /^https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\//i;

  if ((s3Prefix && value.startsWith(s3Prefix)) || genericS3Pattern.test(value)) {
    return `/api/web-media?src=${encodeURIComponent(value)}`;
  }

  return value;
}

export function isWebCmsProxyUrl(url: string) {
  const value = String(url || "").trim();
  return value.startsWith("/api/web-media?");
}
