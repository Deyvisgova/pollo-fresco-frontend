import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../servicios/sesion.servicio';

type VistaReporte = 'resumen' | 'ventas' | 'stock' | 'cobrar' | 'proveedores' | 'delivery' | 'gastos' | 'auditoria';

interface ReporteApi {
  fecha_desde: string;
  fecha_hasta: string;
  resumen: Record<string, number>;
  ventas: any[];
  stock: any[];
  cuentas_cobrar: any[];
  proveedores: any[];
  delivery: any[];
  gastos: any[];
  auditoria: any[];
}

@Component({
  selector: 'app-privado-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class PrivadoReportes implements OnInit {
  vistaActiva: VistaReporte = 'resumen';
  fechaDesde = this.inicioMesActual();
  fechaHasta = this.finMesActual();
  cargando = false;
  mensajeError = '';

  resumen: Record<string, number> = {};
  ventas: any[] = [];
  stock: any[] = [];
  cuentasCobrar: any[] = [];
  proveedores: any[] = [];
  delivery: any[] = [];
  gastos: any[] = [];
  auditoria: any[] = [];

  readonly vistas: Array<{ codigo: VistaReporte; nombre: string }> = [
    { codigo: 'resumen', nombre: 'Resumen' },
    { codigo: 'ventas', nombre: 'Ventas y ganancias' },
    { codigo: 'stock', nombre: 'Stock y lotes' },
    { codigo: 'cobrar', nombre: 'Cuentas por cobrar' },
    { codigo: 'proveedores', nombre: 'Proveedores' },
    { codigo: 'delivery', nombre: 'Delivery' },
    { codigo: 'gastos', nombre: 'Gastos' },
    { codigo: 'auditoria', nombre: 'Auditoria' }
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.cargando = true;
    this.mensajeError = '';
    const params = new HttpParams().set('fecha_desde', this.fechaDesde).set('fecha_hasta', this.fechaHasta);

    this.http.get<ReporteApi>('/api/reportes/resumen', { headers: this.obtenerHeaders(), params }).subscribe({
      next: (respuesta) => {
        this.resumen = respuesta.resumen ?? {};
        this.ventas = respuesta.ventas ?? [];
        this.stock = respuesta.stock ?? [];
        this.cuentasCobrar = respuesta.cuentas_cobrar ?? [];
        this.proveedores = respuesta.proveedores ?? [];
        this.delivery = respuesta.delivery ?? [];
        this.gastos = respuesta.gastos ?? [];
        this.auditoria = respuesta.auditoria ?? [];
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = error?.error?.message || 'No se pudo cargar el reporte.';
        this.cargando = false;
      }
    });
  }

  cambiarVista(vista: VistaReporte): void {
    this.vistaActiva = vista;
  }

  aplicarMesActual(): void {
    this.fechaDesde = this.inicioMesActual();
    this.fechaHasta = this.finMesActual();
    this.cargarReporte();
  }

  imprimir(): void {
    window.print();
  }

  descargarPdf(): void {
    this.mensajeError = '';
    const params = new HttpParams()
      .set('fecha_desde', this.fechaDesde)
      .set('fecha_hasta', this.fechaHasta)
      .set('vista', this.vistaActiva);

    this.http.get('/api/reportes/pdf', { headers: this.obtenerHeaders(), params, responseType: 'blob' }).subscribe({
      next: (archivo) => {
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(archivo);
        enlace.download = `reporte-${this.vistaActiva}-${this.fechaDesde}-${this.fechaHasta}.pdf`;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
      },
      error: () => this.mensajeError = 'No se pudo generar el PDF.'
    });
  }

  dinero(valor: unknown): number {
    return Number(valor ?? 0);
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private inicioMesActual(): string {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private finMesActual(): string {
    const fecha = new Date();
    const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    return `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`;
  }
}
