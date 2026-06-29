import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SesionServicio } from './sesion.servicio';

export interface PaginaPublicaContenido {
  titulo_portada: string; descripcion_portada: string;
  slides: Array<{ titulo: string; resumen: string; detalle: string; imagen_url: string }>;
  banner_nosotros_url: string; banner_productos_url: string; banner_clientes_url: string; banner_contacto_url: string;
  titulo_nosotros: string; descripcion_nosotros: string; mision: string; vision: string; valores: string;
  titulo_productos: string; descripcion_productos: string; titulo_clientes: string; descripcion_clientes: string;
  productos_destacados: Array<{ nombre: string; descripcion: string; precio: string; imagen_url: string }>;
  testimonios: Array<{ autor: string; texto: string }>;
  titulo_contacto: string; descripcion_contacto: string; descripcion_footer: string;
  direccion: string; horario: string; telefono: string; whatsapp: string; correo: string;
  facebook_url: string; instagram_url: string; tiktok_url: string;
  mostrar_nosotros: boolean; mostrar_contacto: boolean;
}

export const PAGINA_PUBLICA_BASE: PaginaPublicaContenido = {
  titulo_portada: 'Pollo fresco, directo del mercado a tu cocina',
  descripcion_portada: 'Seleccionamos cada producto para asegurar calidad, sabor y atencion confiable.',
  titulo_nosotros: 'Tradicion de Pollo Fresco en el mercado Ayaymama',
  slides: [
    { titulo: 'Pollo entero', resumen: 'Frescura diaria lista para tu cocina.', detalle: 'Seleccionado para hogares y negocios.', imagen_url: 'assets/images/carusel/carousel-2.svg' },
    { titulo: 'Cortes premium', resumen: 'Cortes limpios y listos para preparar.', detalle: 'Presentaciones para cada necesidad.', imagen_url: 'assets/images/carusel/carousel-1.svg' },
    { titulo: 'Atencion mayorista', resumen: 'Abastecimiento coordinado para tu negocio.', detalle: 'Pedidos y entregas planificadas.', imagen_url: 'assets/images/carusel/carousel-3.svg' }
  ],
  banner_nosotros_url: 'assets/images/banners-paginas/nosotros.svg', banner_productos_url: 'assets/images/banners-paginas/productos.svg',
  banner_clientes_url: 'assets/images/banners-paginas/clientes.svg', banner_contacto_url: 'assets/images/banners-paginas/contacto.svg',
  descripcion_nosotros: 'Somos un equipo familiar que abastece hogares y negocios con productos frescos.',
  mision: 'Ofrecer productos de confianza con atencion cercana.', vision: 'Ser la opcion favorita por nuestra calidad diaria.',
  valores: 'Honestidad, higiene, puntualidad y compromiso.', direccion: 'Mercado Ayaymama - Pollo Fresco',
  titulo_productos: 'Productos frescos y listos para vender', descripcion_productos: 'Seleccionamos y preparamos cada pedido con cuidado.',
  titulo_clientes: 'Clientes que confian en nosotros', descripcion_clientes: 'Negocios y familias que valoran nuestra calidad.',
  productos_destacados: [
    { nombre: 'Pollo entero', descripcion: 'Ideal para asados, guisos y negocios.', precio: 'Desde S/ 12.00', imagen_url: 'assets/images/carusel/carousel-2.svg' },
    { nombre: 'Pechuga premium', descripcion: 'Corte limpio para porciones saludables.', precio: 'Desde S/ 14.50', imagen_url: 'assets/images/carusel/carousel-1.svg' },
    { nombre: 'Pierna y muslo', descripcion: 'Jugosos y rendidores.', precio: 'Desde S/ 11.00', imagen_url: 'assets/images/carusel/carousel-3.svg' }
  ],
  testimonios: [
    { autor: 'Polleria Don Lucho', texto: 'Siempre encuentro productos frescos y el pedido llega puntual.' },
    { autor: 'Restaurante La Parra', texto: 'Buena atencion y precios claros.' },
    { autor: 'Familia Ramos', texto: 'Compramos cada semana y recibimos una excelente atencion.' }
  ],
  titulo_contacto: 'Contactanos en el mercado Ayaymama', descripcion_contacto: 'Coordinemos tu pedido diario o mayorista.',
  descripcion_footer: 'Productos frescos con atencion diaria y entregas coordinadas.',
  horario: 'Lunes a Domingo 6:00 - 19:00', telefono: '+51 965 432 100', whatsapp: '51965432100',
  correo: 'ventas@pollofresco.pe', facebook_url: '', instagram_url: '', tiktok_url: '',
  mostrar_nosotros: true, mostrar_contacto: true
};

@Injectable({ providedIn: 'root' })
export class PaginaPublicaServicio {
  readonly contenido = signal<PaginaPublicaContenido>(PAGINA_PUBLICA_BASE);
  constructor(private http: HttpClient, private sesion: SesionServicio) { this.cargar(); }
  cargar(): void { this.http.get<PaginaPublicaContenido>('/api/pagina-publica').subscribe({ next: r => this.contenido.set(r) }); }
  obtener(): Observable<PaginaPublicaContenido> { return this.http.get<PaginaPublicaContenido>('/api/pagina-publica').pipe(tap(r => this.contenido.set(r))); }
  guardar(datos: PaginaPublicaContenido): Observable<any> { return this.http.put('/api/pagina-publica', datos, { headers: this.headers() }).pipe(tap(() => this.contenido.set(datos))); }
  subirImagen(archivo: File, carpeta: 'slider' | 'banners' | 'productos' = 'productos'): Observable<any> {
    const f = new FormData();
    f.append('imagen', archivo);
    f.append('carpeta', carpeta);
    return this.http.post('/api/pagina-publica/imagen', f, { headers: this.headers() });
  }
  private headers(): HttpHeaders { const t = this.sesion.obtenerToken(); return new HttpHeaders(t ? { Authorization: `Bearer ${t}` } : {}); }
}
