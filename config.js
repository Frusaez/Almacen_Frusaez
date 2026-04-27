// ════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN DE LA APP — Frutos Secos Sáez
//  Edita este archivo para personalizar la aplicación
// ════════════════════════════════════════════════════════════════

const CONFIG = {

  // ── BACKEND (Google Apps Script) ───────────────────────────────
  // Pega aquí la URL que obtienes al implementar el Apps Script
  // script.google.com → Implementar → Nueva implementación → URL
  backendUrl: 'PEGAR_URL_APPS_SCRIPT_AQUI',
  // Ejemplo: 'https://script.google.com/macros/s/AKfycb.../exec'

  // ── EMPRESA ─────────────────────────────────────────────────────
  nombre:    'Frutos Secos Sáez',
  subtitulo: 'Gestión de Almacén · Almendra',

  // ── ALMACÉN ─────────────────────────────────────────────────────
  numCalles:       20,   // número de calles
  sacasMaxCalle:   24,   // capacidad máxima por calle
  sacasMaxCamara:  24,   // capacidad máxima por cámara frigorífica
  numCamaras:       3,   // número de cámaras
  // Zona Muerta: sin límite (0 = ilimitado)

  // Calles que por defecto se marcan como "pepita comprada"
  callesPepitaDefault: [1, 2, 6, 7, 11, 12, 16, 17],

  // ── CALIBRES ────────────────────────────────────────────────────
  calibres: ['B10', 'S10', '10/12', 'S12', '12/14', 'S15', 'Propietario'],

  // ── VARIEDADES ──────────────────────────────────────────────────
  variedades: [
    'Cáscara', 'Penta', 'Comuna', 'Marcona', 'Garriguez',
    'Ramillete', 'Largueta', 'Vairo', 'Lauran',
    'Floración Tardía', 'Ferragnes', 'Ferranduel'
  ],

  // ── TIPOS DE ANALÍTICA FITOSANITARIA ────────────────────────────
  tiposAnalitica: [
    { k: 'fosetil',      n: 'Fosetil'           },
    { k: 'herbicidas',   n: 'Herbicidas ácidos'  },
    { k: 'glifosato',    n: 'Glifosato'          },
    { k: 'multiresiduo', n: 'Multirresiduo'       },
    { k: 'aflatoxinas',  n: 'Aflatoxinas'        },
    { k: 'salmonela',    n: 'Salmonela'          },
    { k: 'ecoli',        n: 'E-coli'             },
  ],

  // ── SINCRONIZACIÓN ──────────────────────────────────────────────
  // Cada cuántos segundos se refresca la app para ver cambios de otros
  autoRefreshSegundos: 40,

  // ── COLORES (CSS vars en style.css, esto es solo referencia) ────
  // Verde hierba empresa:  #5a8827
  // Marrón almendra:       #4a2a0e

};
