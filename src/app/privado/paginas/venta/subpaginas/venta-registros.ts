import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface VentaGuardada {
  comprobante_venta_id: number;
  tipo_comprobante: string;
  serie: string;
  numero: string;
  fecha_emision: string;
  cliente_nombre: string;
  total: number;
  moneda: string;
  estado_sunat: string;
}

interface ResumenSunat {
  resumen_id: number;
  fecha_documentos: string;
  nombre_archivo: string;
  ticket: string | null;
  estado: string;
  cantidad_boletas: number;
  respuesta_descripcion: string | null;
}

interface ComunicacionBaja {
  comunicacion_baja_id: number;
  comprobante_venta_id: number;
  serie: string;
  numero: string;
  cliente_nombre: string | null;
  motivo: string;
  ticket: string | null;
  estado: string;
}

@Component({
  selector: 'app-privado-venta-registros',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './venta-registros.html',
  styleUrl: './venta-registros.css'
})
export class PrivadoVentaRegistros implements OnInit {
  ventasRegistradas: VentaGuardada[] = [];
  ventasRegistradasBase: VentaGuardada[] = [];
  cargando = false;
  error = '';
  buscando = '';
  fechaDesde = '';
  fechaHasta = '';
  tipoFiltro = '';
  formatoVoucher: 'a4' | 'ticket-80' | 'ticket-57' = 'a4';
  fechaResumen = new Date().toISOString().slice(0, 10);
  resumenes: ResumenSunat[] = [];
  operandoSunat = false;
  ventaNota: VentaGuardada | null = null;
  motivoNotaCodigo = '01';
  motivoNotaDescripcion = 'ANULACION DE LA OPERACION';
  ventaNotaDebito: VentaGuardada | null = null;
  motivoDebitoCodigo = '01';
  motivoDebitoDescripcion = 'INTERESES POR MORA';
  conceptoDebito = 'INTERESES POR MORA';
  montoDebito: number | null = null;
  bajas: ComunicacionBaja[] = [];
  ventaBaja: VentaGuardada | null = null;
  motivoBaja = 'ERROR EN LA EMISION DEL COMPROBANTE';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarVentas();
    this.cargarResumenes();
    this.cargarBajas();
  }

  cargarVentas(): void {
    this.error = '';
    this.cargando = true;

    let params = new HttpParams();
    if (this.buscando.trim()) {
      params = params.set('buscar', this.buscando.trim());
    }
    if (this.fechaDesde) {
      params = params.set('fecha_desde', this.fechaDesde);
    }
    if (this.fechaHasta) {
      params = params.set('fecha_hasta', this.fechaHasta);
    }
    if (this.tipoFiltro) {
      params = params.set('tipo_comprobante', this.tipoFiltro);
    }

    this.http.get<VentaGuardada[]>('/api/ventas', { headers: this.obtenerHeaders(), params }).subscribe({
      next: (ventas) => {
        this.ventasRegistradasBase = ventas;
        this.aplicarFiltroTipo();
        this.cargando = false;
      },
      error: (err) => {
        this.ventasRegistradas = [];
        this.ventasRegistradasBase = [];
        this.error = err?.error?.message ?? 'No se pudieron cargar las ventas.';
        this.cargando = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.buscando = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.tipoFiltro = '';
    this.cargarVentas();
  }

  aplicarFiltroTipo(): void {
    this.ventasRegistradas = this.tipoFiltro
      ? this.ventasRegistradasBase.filter(venta => venta.tipo_comprobante === this.tipoFiltro)
      : [...this.ventasRegistradasBase];
  }

  imprimir(venta: VentaGuardada): void {
    this.obtenerPdfBlob(venta.comprobante_venta_id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const ventana = window.open(url, '_blank');
        if (ventana) {
          ventana.onload = () => ventana.print();
        }
      },
      error: () => {
        this.error = 'No se pudo generar el PDF para imprimir.';
      }
    });
  }

  descargar(venta: VentaGuardada): void {
    this.obtenerPdfBlob(venta.comprobante_venta_id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `comprobante-${venta.serie}-${venta.numero}.pdf`;
        enlace.click();
      },
      error: () => {
        this.error = 'No se pudo descargar el PDF.';
      }
    });
  }

  compartir(venta: VentaGuardada): void {
    this.obtenerPdfBlob(venta.comprobante_venta_id).subscribe({
      next: async (blob) => {
        const archivo = new File([blob], `comprobante-${venta.serie}-${venta.numero}.pdf`, {
          type: 'application/pdf'
        });

        if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
          await navigator.share({
            title: `Comprobante ${venta.serie}-${venta.numero}`,
            text: 'Adjunto el comprobante de venta.',
            files: [archivo]
          });
          return;
        }

        this.error = 'Tu navegador no soporta compartir archivos. Usa descargar.';
      },
      error: () => {
        this.error = 'No se pudo preparar el archivo para compartir.';
      }
    });
  }

  descargarXml(venta: VentaGuardada): void {
    this.http
      .get(`/api/ventas/${venta.comprobante_venta_id}/xml`, {
        headers: this.obtenerHeaders(),
        responseType: 'blob'
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = `comprobante-${venta.serie}-${venta.numero}.xml`;
          enlace.click();
        },
        error: () => {
          this.error = 'No se pudo descargar el XML.';
        }
      });
  }

  descargarCdr(venta: VentaGuardada): void {
    this.http.get(`/api/ventas/${venta.comprobante_venta_id}/cdr`, {
      headers: this.obtenerHeaders(),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `R-${venta.serie}-${venta.numero}.zip`;
        enlace.click();
      },
      error: () => {
        this.error = 'Este comprobante todavia no tiene un CDR disponible.';
      }
    });
  }

  tieneCdr(venta: VentaGuardada): boolean {
    return ['ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES', 'RECHAZADO', 'ANULADO'].includes(venta.estado_sunat);
  }

  enviarSunat(venta: VentaGuardada): void {
    this.error = '';
    this.http.post<{ estado_sunat: string; descripcion: string }>(
      `/api/ventas/${venta.comprobante_venta_id}/enviar-sunat`,
      {},
      { headers: this.obtenerHeaders() }
    ).subscribe({
      next: (respuesta) => {
        venta.estado_sunat = respuesta.estado_sunat;
      },
      error: (error) => {
        this.error = error?.error?.message ?? 'No se pudo enviar el comprobante a SUNAT.';
      }
    });
  }

  puedeEnviarSunat(venta: VentaGuardada): boolean {
    return ['factura', 'nota-credito', 'nota-debito'].includes(venta.tipo_comprobante)
      && !['ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES'].includes(venta.estado_sunat);
  }

  puedeCrearNota(venta: VentaGuardada): boolean {
    return venta.tipo_comprobante === 'factura'
      && ['ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES'].includes(venta.estado_sunat);
  }

  puedeCrearNotaDebito(venta: VentaGuardada): boolean {
    return venta.tipo_comprobante === 'factura'
      && ['ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES'].includes(venta.estado_sunat);
  }

  puedeDarBaja(venta: VentaGuardada): boolean {
    return venta.tipo_comprobante === 'factura'
      && ['ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES'].includes(venta.estado_sunat)
      && !this.bajas.some(baja => baja.comprobante_venta_id === venta.comprobante_venta_id
        && !['RECHAZADO', 'ERROR_ENVIO'].includes(baja.estado));
  }

  abrirNota(venta: VentaGuardada): void {
    this.ventaNota = venta;
    this.motivoNotaCodigo = '01';
    this.actualizarDescripcionNota();
  }

  cerrarNota(): void {
    this.ventaNota = null;
  }

  actualizarDescripcionNota(): void {
    this.motivoNotaDescripcion = this.motivoNotaCodigo === '06'
      ? 'DEVOLUCION TOTAL'
      : 'ANULACION DE LA OPERACION';
  }

  crearNotaCredito(): void {
    if (!this.ventaNota) return;
    this.operandoSunat = true;
    this.http.post<VentaGuardada>(`/api/ventas/${this.ventaNota.comprobante_venta_id}/nota-credito`, {
      motivo_codigo: this.motivoNotaCodigo,
      motivo_descripcion: this.motivoNotaDescripcion
    }, { headers: this.obtenerHeaders() }).subscribe({
      next: () => {
        this.operandoSunat = false;
        this.cerrarNota();
        this.cargarVentas();
      },
      error: (error) => {
        this.operandoSunat = false;
        this.error = error?.error?.message ?? 'No se pudo crear la nota de credito.';
      }
    });
  }

  abrirNotaDebito(venta: VentaGuardada): void {
    this.ventaNotaDebito = venta;
    this.motivoDebitoCodigo = '01';
    this.actualizarDescripcionDebito();
    this.montoDebito = null;
  }

  cerrarNotaDebito(): void {
    this.ventaNotaDebito = null;
  }

  actualizarDescripcionDebito(): void {
    const descripciones: Record<string, string> = {
      '01': 'INTERESES POR MORA',
      '02': 'AUMENTO EN EL VALOR',
      '03': 'PENALIDADES U OTROS CONCEPTOS'
    };
    this.motivoDebitoDescripcion = descripciones[this.motivoDebitoCodigo];
    this.conceptoDebito = this.motivoDebitoDescripcion;
  }

  crearNotaDebito(): void {
    if (!this.ventaNotaDebito || !this.montoDebito || this.montoDebito <= 0) return;
    this.operandoSunat = true;
    this.error = '';
    this.http.post<VentaGuardada>(`/api/ventas/${this.ventaNotaDebito.comprobante_venta_id}/nota-debito`, {
      motivo_codigo: this.motivoDebitoCodigo,
      motivo_descripcion: this.motivoDebitoDescripcion,
      concepto: this.conceptoDebito,
      monto: this.montoDebito
    }, { headers: this.obtenerHeaders() }).subscribe({
      next: () => {
        this.operandoSunat = false;
        this.cerrarNotaDebito();
        this.cargarVentas();
      },
      error: (error) => {
        this.operandoSunat = false;
        this.error = error?.error?.message ?? 'No se pudo crear la nota de debito.';
      }
    });
  }

  cargarResumenes(): void {
    this.http.get<ResumenSunat[]>('/api/sunat/resumenes', { headers: this.obtenerHeaders() }).subscribe({
      next: (resumenes) => this.resumenes = resumenes,
      error: () => this.resumenes = []
    });
  }

  enviarResumen(): void {
    this.operandoSunat = true;
    this.error = '';
    this.http.post('/api/sunat/resumenes', { fecha: this.fechaResumen }, { headers: this.obtenerHeaders() }).subscribe({
      next: () => {
        this.operandoSunat = false;
        this.cargarResumenes();
        this.cargarVentas();
      },
      error: (error) => {
        this.operandoSunat = false;
        this.error = error?.error?.message ?? 'No se pudo enviar el resumen diario.';
      }
    });
  }

  consultarResumen(resumen: ResumenSunat): void {
    this.operandoSunat = true;
    this.http.post(`/api/sunat/resumenes/${resumen.resumen_id}/consultar`, {}, {
      headers: this.obtenerHeaders()
    }).subscribe({
      next: () => {
        this.operandoSunat = false;
        this.cargarResumenes();
        this.cargarVentas();
      },
      error: (error) => {
        this.operandoSunat = false;
        this.error = error?.error?.message ?? 'No se pudo consultar el ticket.';
      }
    });
  }

  cargarBajas(): void {
    this.http.get<ComunicacionBaja[]>('/api/sunat/bajas', { headers: this.obtenerHeaders() }).subscribe({
      next: (bajas) => this.bajas = bajas,
      error: () => this.bajas = []
    });
  }

  abrirBaja(venta: VentaGuardada): void {
    this.ventaBaja = venta;
    this.motivoBaja = 'ERROR EN LA EMISION DEL COMPROBANTE';
  }

  cerrarBaja(): void {
    this.ventaBaja = null;
  }

  enviarBaja(): void {
    if (!this.ventaBaja || !this.motivoBaja.trim()) return;
    this.operandoSunat = true;
    this.error = '';
    this.http.post(`/api/sunat/bajas/ventas/${this.ventaBaja.comprobante_venta_id}`, {
      motivo: this.motivoBaja.trim()
    }, { headers: this.obtenerHeaders() }).subscribe({
      next: () => {
        this.operandoSunat = false;
        this.cerrarBaja();
        this.cargarBajas();
        this.cargarVentas();
      },
      error: (error) => {
        this.operandoSunat = false;
        this.error = error?.error?.message ?? 'No se pudo comunicar la baja.';
      }
    });
  }

  consultarBaja(baja: ComunicacionBaja): void {
    this.operandoSunat = true;
    this.http.post(`/api/sunat/bajas/${baja.comunicacion_baja_id}/consultar`, {}, {
      headers: this.obtenerHeaders()
    }).subscribe({
      next: () => {
        this.operandoSunat = false;
        this.cargarBajas();
        this.cargarVentas();
      },
      error: (error) => {
        this.operandoSunat = false;
        this.error = error?.error?.message ?? 'No se pudo consultar la comunicacion de baja.';
      }
    });
  }

  private obtenerPdfBlob(ventaId: number) {
    return this.http.get(`/api/ventas/${ventaId}/pdf?formato=${this.formatoVoucher}`, {
      headers: this.obtenerHeaders(),
      responseType: 'blob'
    });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
