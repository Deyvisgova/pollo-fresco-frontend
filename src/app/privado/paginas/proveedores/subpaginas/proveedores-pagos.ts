import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';
import { SelectBonitoDirective } from '../../../../compartido/directivas/select-bonito.directive';

interface PagoProveedor {
  pago_id: number;
  total: number;
  monto_transferencia: number;
  monto_efectivo: number;
  saldo: number;
  estado: string;
  cantidad_entregas: number;
  proveedor_id?: number | null;
  proveedor?: { nombres: string; apellidos: string | null } | null;
  proveedor_pagado: string | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  creado_en: string;
}

interface ProveedorFiltro {
  proveedor_id: number;
  nombre: string;
}

@Component({
  selector: 'app-privado-proveedores-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SelectBonitoDirective],
  templateUrl: './proveedores-pagos.html',
  styleUrl: './proveedores-pagos.css'
})
export class PrivadoProveedoresPagos implements OnInit {
  busqueda = '';
  filtroProveedorId = '';
  filtroFecha = '';
  pagos: PagoProveedor[] = [];
  proveedoresFiltro: ProveedorFiltro[] = [];
  cargando = false;
  error = '';

  constructor(private readonly http: HttpClient, private readonly sesionServicio: SesionServicio) {}

  ngOnInit(): void {
    this.cargarPagos();
  }

  cargarPagos(): void {
    this.cargando = true;
    this.error = '';
    const headers = this.obtenerHeaders();
    const params = this.construirQuery();

    this.http.get<PagoProveedor[]>(`/api/pagos-proveedor${params}`, { headers }).subscribe({
      next: (pagos) => {
        this.pagos = pagos;
        this.actualizarProveedoresFiltro(pagos);
      },
      error: () => {
        this.error = 'No se pudo cargar el historial de pagos.';
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }

  descargarPdfFiltrado(): void {
    const headers = this.obtenerHeaders();
    const params = this.construirQuery();

    this.http.get(`/api/pagos-proveedor/pdf${params}`, { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'historial-pagos-proveedor.pdf';
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.error = 'No se pudo descargar el ?? de pagos.';
      }
    });
  }

  proveedorPagadoTexto(pago: PagoProveedor): string {
    const desdeCampo = String(pago.proveedor_pagado ?? '').trim();
    if (desdeCampo) {
      return desdeCampo;
    }

    const nombreProveedor = `${pago.proveedor?.nombres ?? ''} ${pago.proveedor?.apellidos ?? ''}`.trim();
    if (nombreProveedor) {
      return nombreProveedor;
    }

    if (pago.proveedor_id) {
      return `Proveedor #${pago.proveedor_id}`;
    }

    return '-';
  }

  formatearRangoFechas(fechaDesde: string | null, fechaHasta: string | null): string {
    if (!fechaDesde && !fechaHasta) {
      return '-';
    }

    const desde = this.formatearFechaCorta(fechaDesde);
    const hasta = this.formatearFechaCorta(fechaHasta);

    if (desde && hasta) {
      return `${desde} a ${hasta}`;
    }

    return desde || hasta || '-';
  }

  estadoEsPagado(estado: string): boolean {
    return String(estado ?? '').trim().toUpperCase() === 'PAGADO';
  }

  private actualizarProveedoresFiltro(pagos: PagoProveedor[]): void {
    const mapa = new Map<number, string>();

    pagos.forEach((pago) => {
      if (!pago.proveedor_id) {
        return;
      }

      const nombre = `${pago.proveedor?.nombres ?? ''} ${pago.proveedor?.apellidos ?? ''}`.trim() || `Proveedor #${pago.proveedor_id}`;
      if (!mapa.has(pago.proveedor_id)) {
        mapa.set(pago.proveedor_id, nombre);
      }
    });

    this.proveedoresFiltro = Array.from(mapa.entries())
      .map(([proveedor_id, nombre]) => ({ proveedor_id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private construirQuery(): string {
    const params = new URLSearchParams();

    const search = this.busqueda.trim();
    if (search) {
      params.set('search', search);
    }

    if (this.filtroProveedorId) {
      params.set('proveedor_id', this.filtroProveedorId);
    }

    if (this.filtroFecha) {
      params.set('fecha', this.filtroFecha);
    }

    const query = params.toString();
    return query ? ` - ${query}` : '';
  }

  private formatearFechaCorta(fecha: string | null): string {
    if (!fecha) {
      return '';
    }

    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(valor);
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
