import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SesionServicio } from '../../../servicios/sesion.servicio';

interface InicioApi {
  fecha_desde: string;
  fecha_hasta: string;
  indicadores: Record<string, number>;
  ventas_diarias: any[];
  productos_mas_vendidos: any[];
  stock_bajo: any[];
  mayores_deudores: any[];
  delivery: any[];
  distribucion: any[];
}

@Component({
  selector: 'app-privado-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class PrivadoInicio implements OnInit {
  fechaDesde = this.inicioMes();
  fechaHasta = this.finMes();
  indicadores: Record<string, number> = {};
  ventasDiarias: any[] = [];
  productos: any[] = [];
  stockBajo: any[] = [];
  deudores: any[] = [];
  delivery: any[] = [];
  distribucion: any[] = [];
  cargando = false;
  error = '';

  constructor(private readonly http: HttpClient, private readonly sesion: SesionServicio) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    const params = new HttpParams().set('fecha_desde', this.fechaDesde).set('fecha_hasta', this.fechaHasta);
    this.http.get<InicioApi>('/api/reportes/inicio', { headers: this.headers(), params }).subscribe({
      next: (r) => {
        this.indicadores = r.indicadores ?? {};
        this.ventasDiarias = r.ventas_diarias ?? [];
        this.productos = r.productos_mas_vendidos ?? [];
        this.stockBajo = r.stock_bajo ?? [];
        this.deudores = r.mayores_deudores ?? [];
        this.delivery = r.delivery ?? [];
        this.distribucion = r.distribucion ?? [];
        this.cargando = false;
      },
      error: (e) => { this.error = e?.error?.message || 'No se pudo cargar el panel.'; this.cargando = false; }
    });
  }

  aplicarMes(): void { this.fechaDesde = this.inicioMes(); this.fechaHasta = this.finMes(); this.cargar(); }
  maxVentas(): number { return Math.max(...this.ventasDiarias.map((x) => Number(x.total)), 1); }
  altura(valor: number): number { return Math.max(3, Math.round((Number(valor) / this.maxVentas()) * 100)); }
  maxProducto(): number { return Math.max(...this.productos.map((x) => Number(x.total)), 1); }
  anchoProducto(valor: number): number { return Math.round((Number(valor) / this.maxProducto()) * 100); }
  totalDistribucion(): number { return this.distribucion.reduce((a, x) => a + Number(x.valor), 0); }
  porcentaje(valor: number): number { return this.totalDistribucion() ? Math.round((Number(valor) / this.totalDistribucion()) * 100) : 0; }
  estiloDona(): string {
    const total = this.totalDistribucion();
    if (!total) return 'conic-gradient(#e7edf5 0 100%)';

    let acumulado = 0;
    const segmentos = this.distribucion.map((item) => {
      const inicio = acumulado;
      acumulado += (Number(item.valor) / total) * 100;
      return `${item.color} ${inicio.toFixed(2)}% ${acumulado.toFixed(2)}%`;
    });
    return `conic-gradient(${segmentos.join(', ')})`;
  }
  dinero(v: unknown): number { return Number(v ?? 0); }

  private headers(): HttpHeaders {
    const token = this.sesion.obtenerToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
  private inicioMes(): string { const f = new Date(); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-01`; }
  private finMes(): string { const f = new Date(); const u = new Date(f.getFullYear(), f.getMonth() + 1, 0); return `${u.getFullYear()}-${String(u.getMonth() + 1).padStart(2, '0')}-${String(u.getDate()).padStart(2, '0')}`; }
}
