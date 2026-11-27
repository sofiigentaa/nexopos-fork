// Golondrina en NexoPOS: asistente que hace las cosas con tus palabras («nueva venta»,
// «buscar bolso», «abrir caja», «reporte de ventas»…) y aprende las costumbres de cada
// usuario. 100% configurable: se presenta la primera vez (⚙ o «configurar» para cambiarla).
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Golondrina, type Accion } from '@/golondrina';

let instancia: Golondrina | null = null;
function obtener() {
    if (!instancia) {
        instancia = new Golondrina({
            app: 'nexopos',
            acciones: [],
            colorPrimario: '#db2777',
            saludo:
                '¡Hola! Soy Golondrina. Pedime lo que necesites: «nueva venta», «buscar bolso», «abrir caja», «ventas de hoy», «registrar un gasto»… Con el uso aprendo lo que hacés siempre y te lo dejo a mano.',
        });
    }
    return instancia;
}

/** Escribe en un campo de React como si lo hiciera el usuario (espera a que aparezca). */
function escribirEn(selector: string, texto: string, intentos = 25) {
    const el = document.querySelector<HTMLInputElement>(selector);
    if (!el) {
        if (intentos > 0) setTimeout(() => escribirEn(selector, texto, intentos - 1), 150);
        return;
    }
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, texto);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
}

/** Toca un botón por su texto (espera a que aparezca). */
function tocar(texto: string, intentos = 25) {
    const b = Array.from(document.querySelectorAll('main button')).find((x) => x.textContent?.trim().toLowerCase() === texto.toLowerCase()) as HTMLButtonElement | undefined;
    if (b) b.click();
    else if (intentos > 0) setTimeout(() => tocar(texto, intentos - 1), 150);
}

function acciones(ir: (ruta: string) => void): Accion[] {
    const pagina = (id: string, titulo: string, ruta: string, frases: string[]): Accion => ({
        id,
        titulo,
        frases,
        ejecutar: () => {
            ir(ruta);
            return `Listo, te llevé a ${titulo.replace(/^Ver /, '').toLowerCase()}.`;
        },
    });
    return [
        pagina('ver-inicio', 'Ver el inicio', '/dashboard', ['inicio', 'cómo vamos', 'resumen del día']),
        {
            id: 'nueva-venta',
            titulo: 'Nueva venta',
            descripcion: 'empezar una venta nueva',
            frases: ['nueva venta', 'hacer una venta', 'quiero cobrar'],
            ejecutar: () => {
                ir('/sales');
                setTimeout(() => tocar('Nueva Venta'), 300);
                return 'Abrí una venta nueva: buscá los productos y elegí cómo te pagan.';
            },
        },
        pagina('ver-ventas', 'Ver las ventas', '/sales', ['ventas', 'ver ventas', 'ventas de hoy', 'cuánto vendí']),
        {
            id: 'abrir-caja',
            titulo: 'Abrir la caja',
            descripcion: 'abrir la caja del día',
            frases: ['abrir caja', 'abrir la caja', 'empezar el día'],
            ejecutar: () => {
                ir('/cash-register');
                setTimeout(() => tocar('Abrir Caja'), 300);
                return 'Te abrí la caja: cargá el efectivo inicial y listo.';
            },
        },
        pagina('ver-caja', 'Ver la caja', '/cash-register', ['caja', 'ver caja', 'arqueo', 'cerrar caja']),
        {
            id: 'buscar-producto',
            titulo: 'Buscar «{consulta}»',
            descripcion: 'buscar un producto por nombre o código',
            frases: ['buscar {consulta}', 'busco {consulta}', 'tenés {consulta}', 'precio de {consulta}', 'stock de {consulta}'],
            parametros: [{ nombre: 'consulta', libre: true, requerido: true, pregunta: '¿Qué producto busco?' }],
            ejecutar: ({ consulta }) => {
                ir('/products');
                escribirEn('main input[placeholder*="Buscar producto"]', consulta);
                return `Busqué «${consulta}» en los productos.`;
            },
        },
        pagina('ver-productos', 'Ver productos', '/products', ['productos', 'ver productos', 'lista de precios', 'inventario']),
        pagina('ver-reposicion', 'Ver qué reponer', '/inventory/replenishment', ['qué tengo que reponer', 'reposición', 'stock bajo', 'qué falta']),
        pagina('ver-clientes', 'Ver clientes', '/customers', ['clientes', 'ver clientes']),
        pagina('ver-cuentas', 'Ver cuentas corrientes', '/customer-accounts', ['cuentas corrientes', 'quién me debe', 'deudores', 'fiado']),
        pagina('ver-gastos', 'Ver gastos', '/expenses', ['gastos', 'ver gastos', 'registrar un gasto', 'cargar un gasto']),
        pagina('ver-ingresos', 'Ver ingresos', '/incomes', ['ingresos', 'registrar ingreso', 'servicios cobrados']),
        pagina('ver-compras', 'Ver compras', '/purchases', ['compras', 'ver compras', 'cargar una compra']),
        pagina('ver-proveedores', 'Ver proveedores', '/suppliers', ['proveedores', 'ver proveedores']),
        pagina('ver-reportes', 'Ver reportes', '/reports', ['reportes', 'reporte de ventas', 'cómo me fue en el mes', 'ganancia del mes']),
        pagina('ver-configuracion', 'Ver la configuración del sistema', '/settings', ['configuración del sistema', 'ajustes del sistema', 'datos del comercio']),
    ];
}

const POR_RUTA: [RegExp, string][] = [
    [/^\/dashboard/, 'ver-inicio'],
    [/^\/sales/, 'ver-ventas'],
    [/^\/cash-register/, 'ver-caja'],
    [/^\/products/, 'ver-productos'],
    [/^\/inventory\/replenishment/, 'ver-reposicion'],
    [/^\/customers/, 'ver-clientes'],
    [/^\/customer-accounts/, 'ver-cuentas'],
    [/^\/expenses/, 'ver-gastos'],
    [/^\/incomes/, 'ver-ingresos'],
    [/^\/purchases/, 'ver-compras'],
    [/^\/suppliers/, 'ver-proveedores'],
    [/^\/reports/, 'ver-reportes'],
];

export function GolondrinaAsistente({ usuario }: { usuario?: string }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const navegar = useRef(navigate);
    navegar.current = navigate;

    useEffect(() => {
        const g = obtener();
        g.definirAcciones(acciones((ruta) => navegar.current(ruta)));
        g.montar();
        return () => {
            g.destruir();
            instancia = null;
        };
    }, []);

    useEffect(() => {
        if (usuario) obtener().usuario(usuario);
    }, [usuario]);

    useEffect(() => {
        const g = obtener();
        g.contexto(pathname.split('/')[1] || 'inicio');
        const r = POR_RUTA.find(([re]) => re.test(pathname));
        if (r) g.registrar(r[1]);
    }, [pathname]);

    return null;
}
