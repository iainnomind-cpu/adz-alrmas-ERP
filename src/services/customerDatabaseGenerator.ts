import { supabase } from '../lib/supabase';
import {
  MODULES_2_TO_9,
  getNextProgressiveAccountNumber,
  getSystemConfig
} from '../utils/customerAccountNumber';

export interface GenerationProgress {
  current: number;
  total: number;
  moduleLabel: string;
  customerName: string;
  accountNumber: string;
}

export interface GenerationResult {
  success: boolean;
  moduleKey: string;
  moduleLabel: string;
  createdCount: number;
  generatedAccounts: string[];
  errors: string[];
}

interface SeedTemplate {
  name: string;
  businessName: string;
  ownerName: string;
  propertyType: 'comercio' | 'casa' | 'banco' | 'rancho' | 'gobierno' | 'colegio';
  customerType: 'comercio' | 'casa' | 'banco';
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  commTech: 'ip' | 'dual' | 'celular' | 'radio' | 'telefono';
  plan: string;
  lat: number;
  lng: number;
}

const MODULE_SEEDS: Record<string, SeedTemplate[]> = {
  cctv: [
    {
      name: 'Centro de Distribución Corona',
      businessName: 'Distribuidora Cervecera de Occidente S.A. de C.V.',
      ownerName: 'Roberto Mendiola Silva',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. López Mateos Sur 4200',
      neighborhood: 'Las Águilas',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_premium',
      lat: 20.6271,
      lng: -103.4182
    },
    {
      name: 'Plaza Galerías Sur - CCTV',
      businessName: 'Inmobiliaria y Plazas Comerciales de Jalisco',
      ownerName: 'Guillermo Orozco Padilla',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Periférico Sur 7800',
      neighborhood: 'Santa María Tequepexpan',
      city: 'Tlaquepaque',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'premium_com_20',
      lat: 20.6012,
      lng: -103.4021
    },
    {
      name: 'Bodega Logística del Bajío',
      businessName: 'Almacenes y Logística Fronteriza S.A.',
      ownerName: 'Alejandro Carrillo Vaca',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Carretera a Colima Km 12.5',
      neighborhood: 'Industrial San Agustín',
      city: 'Tlajomulco de Zúñiga',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_com_15',
      lat: 20.5342,
      lng: -103.4561
    },
    {
      name: 'Farmacia Guadalajara Matriz',
      businessName: 'Corporativo Fragua S.A.B. de C.V.',
      ownerName: 'Esteban Ramírez Delgado',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Javier Mina 1520',
      neighborhood: 'Oblatos',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'dual',
      plan: 'plus_clasico',
      lat: 20.6724,
      lng: -103.3210
    },
    {
      name: 'Hotel Boutique Posada Real',
      businessName: 'Operadora Hotelera Real Tapatía',
      ownerName: 'Carolina Beltrán Navarro',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Calle Independencia 340',
      neighborhood: 'Centro Histórico',
      city: 'Tlaquepaque',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'premium_com_15',
      lat: 20.6401,
      lng: -103.3155
    },
    {
      name: 'Supermercado Central de Abastos',
      businessName: 'Comercializadora Frutas y Víveres del Sur',
      ownerName: 'Martín Barba Sandoval',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Mandarina 1100',
      neighborhood: 'Mercado de Abastos',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_premium',
      lat: 20.6512,
      lng: -103.3814
    }
  ],
  control_acceso: [
    {
      name: 'Torre Corporativa Providencia',
      businessName: 'Desarrollos Corporativos del Bajío',
      ownerName: 'Mariana Lozano De La Vega',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Providencia 2890',
      neighborhood: 'Providencia',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_premium',
      lat: 20.6975,
      lng: -103.3882
    },
    {
      name: 'Condominio Puerta de Hierro',
      businessName: 'Asociación de Colonos Puerta de Hierro A.C.',
      ownerName: 'Ernesto Alatorre Gutiérrez',
      propertyType: 'casa',
      customerType: 'comercio',
      street: 'Blvd. Puerta de Hierro 5100',
      neighborhood: 'Puerta de Hierro',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'dual',
      plan: 'premium_com_20',
      lat: 20.7104,
      lng: -103.4147
    },
    {
      name: 'Laboratorios Bioclínicos de Occidente',
      businessName: 'BioAnálisis y Diagnóstico Integral S.A.',
      ownerName: 'Dra. Claudia Medina Ruiz',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Patria 1450',
      neighborhood: 'Villa Universitaria',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_com_15',
      lat: 20.7022,
      lng: -103.4255
    },
    {
      name: 'Planta Industrial Automotriz',
      businessName: 'Componentes Metálicos Jal S.A. de C.V.',
      ownerName: 'Ing. Fernando Coss y León',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Parque Industrial El Salto Calle 3 #120',
      neighborhood: 'El Salto',
      city: 'El Salto',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'premium_com_20',
      lat: 20.5185,
      lng: -103.2678
    },
    {
      name: 'Gimnasio High Fitness Club',
      businessName: 'Entrenamientos de Vanguardia S.C.',
      ownerName: 'Diego Salcedo Mora',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Chapultepec Sur 250',
      neighborhood: 'Americana',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_clasico',
      lat: 20.6720,
      lng: -103.3685
    }
  ],
  control_asistencia: [
    {
      name: 'Manufacturas y Textiles de Jalisco',
      businessName: 'Confecciones y Maquilas del Valle S.A.',
      ownerName: 'Lic. Laura Elena Ponce',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Calzada González Gallo 2100',
      neighborhood: 'Atlas',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_clasico',
      lat: 20.6540,
      lng: -103.3320
    },
    {
      name: 'Distribuidora de Alimentos Frescos',
      businessName: 'Cárnicos y Embutidos Tapatíos S. de R.L.',
      ownerName: 'Jorge Alberto Zepeda',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Calle 5 de Mayo #120',
      neighborhood: 'San Juan Bosco',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_com_15',
      lat: 20.6811,
      lng: -103.3105
    },
    {
      name: 'Call Center BPO Américas',
      businessName: 'Servicios de Contacto Digital S.A.',
      ownerName: 'Verónica Estrada Luna',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Mariano Otero 3450',
      neighborhood: 'Verde Valle',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'premium_com_20',
      lat: 20.6480,
      lng: -103.3980
    },
    {
      name: 'Colegio México Americano',
      businessName: 'Educación Bilingüe de Guadalajara A.C.',
      ownerName: 'Prof. Salvador Camarena',
      propertyType: 'colegio',
      customerType: 'comercio',
      street: 'Av. Paseo San Arturo 120',
      neighborhood: 'Valle Real',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_clasico',
      lat: 20.7250,
      lng: -103.4380
    },
    {
      name: 'Constructora e Ingeniería Urbana',
      businessName: 'Edificaciones del Pacífico S.A.',
      ownerName: 'Arq. Mario Bros Villalobos',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Lázaro Cárdenas 3200',
      neighborhood: 'Jardines de San Ignacio',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'dual',
      plan: 'plus_premium',
      lat: 20.6690,
      lng: -103.4050
    }
  ],
  domotica: [
    {
      name: 'Residencia Smart Home Las Cañadas',
      businessName: 'Familia Morales Cárdenas',
      ownerName: 'Dr. Guillermo Morales Cárdenas',
      propertyType: 'casa',
      customerType: 'casa',
      street: 'Paseo de las Cañadas 145',
      neighborhood: 'Las Cañadas Country Club',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_premium',
      lat: 20.7680,
      lng: -103.3850
    },
    {
      name: 'Villa Chapala - Domótica Integrada',
      businessName: 'Residencia Villa del Lago',
      ownerName: 'Patricia Arámbula De Anda',
      propertyType: 'casa',
      customerType: 'casa',
      street: 'Paseo Ramón Corona 88',
      neighborhood: 'La Floresta',
      city: 'Ajijic',
      state: 'Jalisco',
      commTech: 'dual',
      plan: 'plus_premium',
      lat: 20.2980,
      lng: -103.2540
    },
    {
      name: 'Penthouse Puerta Plata',
      businessName: 'Residencia Garza Albarrán',
      ownerName: 'Lic. Mauricio Garza Albarrán',
      propertyType: 'casa',
      customerType: 'casa',
      street: 'Paseo Puerta de Hierro 490',
      neighborhood: 'Puerta Plata',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_premium',
      lat: 20.7090,
      lng: -103.4190
    },
    {
      name: 'Casa Campestre Tapalpa',
      businessName: 'Finca Los Pinos Tapalpa',
      ownerName: 'Ignacio Rentería Ortiz',
      propertyType: 'rancho',
      customerType: 'casa',
      street: 'Camino Real a Ferrería Km 3',
      neighborhood: 'Bosque de Tapalpa',
      city: 'Tapalpa',
      state: 'Jalisco',
      commTech: 'celular',
      plan: 'plus_clasico',
      lat: 19.9450,
      lng: -103.7650
    },
    {
      name: 'Residencia Bugambilias Iluminación',
      businessName: 'Familia Lomelí Castañeda',
      ownerName: 'Sra. Beatriz Lomelí',
      propertyType: 'casa',
      customerType: 'casa',
      street: 'Circuito de las Flores 210',
      neighborhood: 'Ciudad Bugambilias 2da Sección',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_clasico',
      lat: 20.6050,
      lng: -103.4520
    }
  ],
  gps_personal: [
    {
      name: 'Custodia y Protección Ejecutiva',
      businessName: 'Servicios de Seguridad Especializada S.A.',
      ownerName: 'Comandante Rodrigo Tello',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Américas 1536',
      neighborhood: 'Country Club',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'celular',
      plan: 'boton_panico',
      lat: 20.6980,
      lng: -103.3750
    },
    {
      name: 'Monitoreo Médico Adulto Mayor',
      businessName: 'Atención Geriátrica Domiciliaria',
      ownerName: 'Dra. Mónica Villarreal',
      propertyType: 'casa',
      customerType: 'casa',
      street: 'Calle Garibaldi 1820',
      neighborhood: 'Ladrón de Guevara',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'celular',
      plan: 'medical_premium',
      lat: 20.6820,
      lng: -103.3710
    },
    {
      name: 'Inspectores de Supervisión en Campo',
      businessName: 'Auditorías y Valuaciones del Centro',
      ownerName: 'Ing. Carlos Mendoza Prieto',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Vallarta 2540',
      neighborhood: 'Arcos Vallarta',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'celular',
      plan: 'boton_panico',
      lat: 20.6740,
      lng: -103.3820
    },
    {
      name: 'Traslados Seguros de Valores Personal',
      businessName: 'Mensajería Blindada Express',
      ownerName: 'Arturo Guzmán Solís',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Washington 890',
      neighborhood: 'Moderna',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'dual',
      plan: 'boton_panico',
      lat: 20.6610,
      lng: -103.3550
    },
    {
      name: 'Protección Personal Ejecutiva Altamira',
      businessName: 'Corporativo Inversionista Altamira',
      ownerName: 'Gabriel Peñaloza',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Patria 880',
      neighborhood: 'Colinas de San Javier',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'celular',
      plan: 'medical_premium',
      lat: 20.6950,
      lng: -103.4080
    }
  ],
  gps_vehicular: [
    {
      name: 'Flotilla Transportes Culiacán',
      businessName: 'Autotransportes de Carga Refrigerada S.A.',
      ownerName: 'Manuel Quintero Félix',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Carretera a Nogales Km 15',
      neighborhood: 'La Venta del Astillero',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'celular',
      plan: 'plus_premium',
      lat: 20.7280,
      lng: -103.5250
    },
    {
      name: 'Logística Fletera Nacional',
      businessName: 'Envíos Rápidos de Occidente S.A. de C.V.',
      ownerName: 'Raúl Enríquez Coronado',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Periférico Norte Manuel Gómez Morín 3400',
      neighborhood: 'Tabachines',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'celular',
      plan: 'plus_com_15',
      lat: 20.7350,
      lng: -103.3550
    },
    {
      name: 'Unidades Médicas de Urgencia',
      businessName: 'Ambulancias y Rescate Privado S.C.',
      ownerName: 'Paramédico Daniel Heredia',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Hidalgo 1420',
      neighborhood: 'Centro',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'dual',
      plan: 'plus_premium',
      lat: 20.6780,
      lng: -103.3590
    },
    {
      name: 'Distribuidora Mayorista de Bebidas',
      businessName: 'Refrescos y Bebidas Naturales S.A.',
      ownerName: 'Héctor Salgado',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Calzada Independencia Sur 950',
      neighborhood: 'Mexicaltzingo',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'celular',
      plan: 'plus_clasico',
      lat: 20.6620,
      lng: -103.3480
    },
    {
      name: 'Servicio de Grúas y Auxilio Vial',
      businessName: 'Grúas Metropolitanas de Occidente',
      ownerName: 'Vicente Padilla Ocampo',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Revolución 2800',
      neighborhood: 'Jardines de la Paz',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'celular',
      plan: 'plus_clasico',
      lat: 20.6480,
      lng: -103.3050
    }
  ],
  red: [
    {
      name: 'Infraestructura IT Torre Minerva',
      businessName: 'Comunicaciones y Servidores Minerva S.A.',
      ownerName: 'Ing. Bruno Valenzuela',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Vallarta 2800',
      neighborhood: 'Vallarta Poniente',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_premium',
      lat: 20.6745,
      lng: -103.3890
    },
    {
      name: 'DataCenter Regional de Occidente',
      businessName: 'Hosting y Cloud Solutions México S.A.',
      ownerName: 'Lic. Adrián Toledo',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Parque Tecnológico Calle 2 #500',
      neighborhood: 'San Juan de Ocotán',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'premium_com_20',
      lat: 20.7180,
      lng: -103.4650
    },
    {
      name: 'Cableado Estructurado Oficinas Centro',
      businessName: 'Despacho Contable y Jurídico Asociados',
      ownerName: 'C.P. Sandra Morales',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Juárez 620',
      neighborhood: 'Centro',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_clasico',
      lat: 20.6750,
      lng: -103.3510
    },
    {
      name: 'Red Inalámbrica Campus Universitario',
      businessName: 'Universidad Tecnológica de Occidente A.C.',
      ownerName: 'Rector Dr. Armando Cuevas',
      propertyType: 'colegio',
      customerType: 'comercio',
      street: 'Av. Colón 4500',
      neighborhood: 'Santa María del Tepeyac',
      city: 'Tlaquepaque',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'premium_com_20',
      lat: 20.6120,
      lng: -103.4080
    },
    {
      name: 'Enlace de Fibra Óptica Punto Sao Paulo',
      businessName: 'Consultoría Financiera Sao Paulo',
      ownerName: 'Rodrigo Santoscoy',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Valparaíso 2360',
      neighborhood: 'Providencia',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_premium',
      lat: 20.7010,
      lng: -103.3780
    }
  ],
  video_portero: [
    {
      name: 'Edificio Residencial Vallarta Suites',
      businessName: 'Condominio Horizontal Vallarta Suites',
      ownerName: 'Administradora Gloria Rendón',
      propertyType: 'casa',
      customerType: 'comercio',
      street: 'Av. México 2750',
      neighborhood: 'Ladrón de Guevara',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_clasico',
      lat: 20.6810,
      lng: -103.3820
    },
    {
      name: 'Condominio La Rioja - Intercom IP',
      businessName: 'Mesa Directiva Fraccionamiento La Rioja',
      ownerName: 'Ing. Gonzalo Macías',
      propertyType: 'casa',
      customerType: 'comercio',
      street: 'Paseo La Rioja 500',
      neighborhood: 'La Rioja Residencial',
      city: 'Tlajomulco de Zúñiga',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_com_15',
      lat: 20.5520,
      lng: -103.4450
    },
    {
      name: 'Torre Alameda Residencial',
      businessName: 'Asociación Civil Torre Alameda',
      ownerName: 'Mtro. Felipe Castañeda',
      propertyType: 'casa',
      customerType: 'comercio',
      street: 'Calzada Independencia Norte 180',
      neighborhood: 'La Perla',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_clasico',
      lat: 20.6790,
      lng: -103.3420
    },
    {
      name: 'Privada Los Cedros - Video Intercom',
      businessName: 'Condominio Los Cedros Zapopan',
      ownerName: 'Silvia Hurtado Flores',
      propertyType: 'casa',
      customerType: 'casa',
      street: 'Av. Novelistas 410',
      neighborhood: 'Jardines Vallarta',
      city: 'Zapopan',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_clasico',
      lat: 20.6750,
      lng: -103.4210
    },
    {
      name: 'Edificio Corporativo Los Arcos',
      businessName: 'Inmuebles y Oficinas Los Arcos S.A.',
      ownerName: 'Javier Navarro',
      propertyType: 'comercio',
      customerType: 'comercio',
      street: 'Av. Niños Héroes 2150',
      neighborhood: 'Moderna',
      city: 'Guadalajara',
      state: 'Jalisco',
      commTech: 'ip',
      plan: 'plus_premium',
      lat: 20.6680,
      lng: -103.3670
    }
  ]
};

/**
 * Genera clientes para un módulo específico (Módulos 2 al 9)
 * Nota estricta: El módulo Alarmas (1) NO se genera y está explícitamente bloqueado.
 */
export async function generateModuleCustomers(
  systemType: string,
  count: number = 5,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GenerationResult> {
  const normType = systemType.toLowerCase().trim();

  if (normType.includes('alarm')) {
    return {
      success: false,
      moduleKey: 'alarma',
      moduleLabel: 'Alarma',
      createdCount: 0,
      generatedAccounts: [],
      errors: ['El módulo Alarmas está protegido por regla de negocio y no debe modificarse.']
    };
  }

  const config = getSystemConfig(normType);
  const seeds = MODULE_SEEDS[normType] || MODULE_SEEDS.cctv;
  const baseOffset = config.baseOffset || 20000;

  const result: GenerationResult = {
    success: true,
    moduleKey: normType,
    moduleLabel: config.label,
    createdCount: 0,
    generatedAccounts: [],
    errors: []
  };

  try {
    for (let i = 0; i < count; i++) {
      // 1. Obtener la siguiente cuenta progresiva consecutiva y no duplicada
      const progressive = await getNextProgressiveAccountNumber(normType);
      const seedIndex = i % seeds.length;
      const seed = seeds[seedIndex];

      const suffix = Math.floor(i / seeds.length) > 0 ? ` #${Math.floor(i / seeds.length) + 1}` : '';
      const customerName = `${seed.name}${suffix}`;
      const businessName = `${seed.businessName}${suffix}`;
      const phoneDigits = String(3310000000 + progressive.nextSequence * 17).slice(-10);
      const emailDomain = normType.replace('_', '') + '.example.com';
      const email = `contacto.${progressive.formattedAccount.toLowerCase().replace(/[^a-z0-9]/g, '')}@${emailDomain}`;

      const payload = {
        name: customerName,
        business_name: businessName,
        owner_name: seed.ownerName,
        phone: phoneDigits,
        email: email,
        address: `${seed.street}, Col. ${seed.neighborhood}, CP 44100, ${seed.city}, ${seed.state}`,
        street: seed.street,
        neighborhood: seed.neighborhood,
        city: seed.city,
        state: seed.state,
        system_type: normType,
        contract_number: progressive.formattedAccount, // Guardar la cuenta alfanumérica explícita
        account_number: progressive.nextDbAccountNumber, // Entero único seguro en PostgreSQL
        customer_type: seed.customerType,
        property_type: seed.propertyType,
        communication_tech: seed.commTech,
        monitoring_plan: seed.plan,
        status: 'active',
        credit_classification: 'puntual',
        account_type: 'normal',
        billing_preference: 'factura_credito',
        billing_cycle: 'monthly',
        service_count: 1,
        is_suspended: false,
        gps_latitude: seed.lat,
        gps_longitude: seed.lng,
        alta_date: new Date().toISOString().split('T')[0]
      };

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: count,
          moduleLabel: config.label,
          customerName: customerName,
          accountNumber: progressive.formattedAccount
        });
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([payload as any])
        .select('id, account_number, contract_number')
        .single();

      if (error) {
        console.error(`Error al insertar cliente ${progressive.formattedAccount}:`, error);
        result.errors.push(`Cliente ${progressive.formattedAccount}: ${error.message}`);
      } else {
        result.createdCount += 1;
        result.generatedAccounts.push(progressive.formattedAccount);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (err) {
    console.error(`Error general generando clientes para ${config.label}:`, err);
    result.success = false;
    result.errors.push(err instanceof Error ? err.message : 'Error desconocido en generación');
    return result;
  }
}

/**
 * Genera la base de datos de clientes para todos los módulos del 2 al 9 en lote.
 * El módulo 1 (Alarmas) queda estrictamente excluido y protegido.
 */
export async function generateAllModulesCustomers(
  countPerModule: number = 5,
  onProgress?: (progress: GenerationProgress) => void
): Promise<{
  success: boolean;
  totalCreated: number;
  moduleResults: Record<string, GenerationResult>;
  summaryErrors: string[];
}> {
  const moduleResults: Record<string, GenerationResult> = {};
  const summaryErrors: string[] = [];
  let totalCreated = 0;
  const totalOperations = MODULES_2_TO_9.length * countPerModule;
  let completedOps = 0;

  for (const mod of MODULES_2_TO_9) {
    const res = await generateModuleCustomers(mod.key, countPerModule, (prog) => {
      if (onProgress) {
        onProgress({
          current: completedOps + prog.current,
          total: totalOperations,
          moduleLabel: mod.label,
          customerName: prog.customerName,
          accountNumber: prog.accountNumber
        });
      }
    });

    completedOps += countPerModule;
    moduleResults[mod.key] = res;
    totalCreated += res.createdCount;
    if (res.errors.length > 0) {
      summaryErrors.push(...res.errors);
    }
  }

  return {
    success: summaryErrors.length === 0,
    totalCreated,
    moduleResults,
    summaryErrors
  };
}
