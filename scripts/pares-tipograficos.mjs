/**
 * Duplas tipográficas verificadas.
 *
 * Todas son de Google Fonts y todas tienen **los pesos exactos que el template
 * usa**: 700 y 900 en la display, 300, 400 y 600 en la de texto. Eso no es un
 * detalle: media Google Fonts no llega a 900, y cuando falta, Chrome estira el
 * 700 y los titulares salen blandos sin que nadie se entere.
 *
 * Se eligen mirando, no leyendo:  npm run tipografias
 */

export const PARES = [
  {
    slug: "amable",
    display: "Mulish",
    texto: "Poppins",
    caracter: "Geométrica amable. Redonda, cercana, sin ser infantil.",
    para: "consumo, e-commerce, D2C, gastronomía",
  },
  {
    slug: "corporativa",
    display: "Montserrat",
    texto: "Source Sans 3",
    caracter: "Clásica y segura. La que nadie discute en una reunión.",
    para: "servicios, B2B, consultoría, inmobiliaria",
  },
  {
    slug: "editorial",
    display: "Archivo",
    texto: "Inter",
    caracter: "Contemporánea y densa. Titulares que ocupan y se leen igual.",
    para: "medios, tecnología, datos, contenido educativo",
  },
  {
    slug: "premium",
    display: "Playfair Display",
    texto: "Work Sans",
    caracter: "Serif de alto contraste. Elegante sin ser antigua.",
    para: "moda, joyería, arquitectura, hotelería, alta gama",
  },
  {
    slug: "artesanal",
    display: "Fraunces",
    texto: "Manrope",
    caracter: "Cálida, con carácter. Hecho a mano sin parecer rústico.",
    para: "café de especialidad, cosmética natural, panadería, vino",
  },
  {
    slug: "minimal",
    display: "Outfit",
    texto: "DM Sans",
    caracter: "Limpia al hueso. Todo el peso lo lleva el espacio en blanco.",
    para: "skincare, wellness, diseño, arquitectura, tecnología",
  },
  {
    slug: "cercana",
    display: "Urbanist",
    texto: "Nunito Sans",
    caracter: "Suave y abierta. Baja la guardia del que lee.",
    para: "salud, educación, pediatría, ONG, servicios a personas",
  },
  {
    slug: "tecnica",
    display: "Epilogue",
    texto: "IBM Plex Sans",
    caracter: "Precisa y seria. Transmite ingeniería, no marketing.",
    para: "software, industria, laboratorios, servicios técnicos",
  },
  {
    slug: "impacto",
    display: "Big Shoulders Display",
    texto: "Barlow",
    caracter: "Condensada y gritona. Entra mucho titular y pega fuerte.",
    para: "deportes, gimnasios, automotor, eventos, delivery",
  },
  {
    slug: "audaz",
    display: "Unbounded",
    texto: "Hanken Grotesk",
    caracter: "Ancha y pop. Se ve distinta a todo lo demás del feed.",
    para: "marcas jóvenes, entretenimiento, gaming, streetwear",
  },
  {
    slug: "robusta",
    display: "Bitter",
    texto: "Karla",
    caracter: "Slab serif sólida. Suena a argumento, no a aviso.",
    para: "consultoría, legal, finanzas, contenido largo",
  },
  {
    slug: "moderna",
    display: "Figtree",
    texto: "Public Sans",
    caracter: "Neutra actual. La opción segura que igual se ve nueva.",
    para: "fintech, SaaS, servicios profesionales, salud privada",
  },
  {
    slug: "periodistica",
    display: "Libre Franklin",
    texto: "Assistant",
    caracter: "De diario. Autoridad sin solemnidad.",
    para: "medios, instituciones, ONG, contenido informativo",
  },
  {
    slug: "divertida",
    display: "Gabarito",
    texto: "Jost",
    caracter: "Geométrica con guiño. Simpática sin ser caricatura.",
    para: "retail, food delivery, mascotas, productos para chicos",
  },
  {
    slug: "institucional",
    display: "Merriweather",
    texto: "Open Sans",
    caracter: "Serif clásica y legible. La más conservadora del set.",
    para: "seguros, salud, educación formal, gobierno, tradicionales",
  },
  {
    slug: "mono-familia",
    display: "Geist",
    texto: "Geist",
    caracter: "Una sola familia para todo. Silenciosa, deja hablar al color.",
    para: "tecnología, marcas de producto, cuando el logo ya es fuerte",
  },
];

export const PESOS_DISPLAY = "700;900";
export const PESOS_TEXTO = "300;400;600";
