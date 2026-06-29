import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmacionServicio } from '../../../servicios/confirmacion.servicio';
import { SesionServicio } from '../../../servicios/sesion.servicio';

type FondoCodigo = 'POLLO_GALLINA' | 'CONGELADOS_HUEVOS';

interface FondoResumen {
  codigo: FondoCodigo;
  nombre: string;
  ventas: number;
  costos: number;
  ganancia: number;
  capital: number;
  pagos_compras: number;
  gastos: number;
  saldo_periodo: number;
  saldo_disponible: number;
}

interface CategoriaGasto {
  categoria_id: number;
  nombre: string;
}

interface MovimientoGasto {
  id: number;
  fecha: string;
  fondo: FondoCodigo;
  tipo: 'GASTO' | 'CAPITAL' | 'COMPRA';
  titulo: string;
  categoria: string;
  monto: number;
  nota: string | null;
  estado: 'ACTIVO' | 'ANULADO';
  motivo_anulacion: string | null;
}

interface AuditoriaGasto {
  auditoria_id: number;
  accion: string;
  entidad: string;
  entidad_id: number | null;
  fondo: FondoCodigo | null;
  descripcion: string;
  creado_en: string;
  usuario: string;
}

interface VentaPolloGallina {
  venta_pg_id?: number;
  fecha: string;
  venta_pollo: number;
  venta_gallina: number;
  observacion: string | null;
}

interface CierreMensual {
  cierre_id: number;
  periodo: string;
  fecha_desde: string;
  fecha_hasta: string;
  pollo_saldo: number;
  otros_saldo: number;
  observacion: string | null;
  cerrado_en: string;
}

interface ResumenGastosApi {
  fecha_desde: string;
  fecha_hasta: string;
  fondos: Record<FondoCodigo, FondoResumen>;
  movimientos: MovimientoGasto[];
  auditoria: AuditoriaGasto[];
  cierres_mensuales: CierreMensual[];
  categorias: CategoriaGasto[];
  venta_pollo_gallina: VentaPolloGallina | null;
}

@Component({
  selector: 'app-privado-gastos',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './gastos.html',
  styleUrl: './gastos.css'
})
export class PrivadoGastos implements OnInit {
  fondos: FondoResumen[] = [];
  movimientos: MovimientoGasto[] = [];
  categorias: CategoriaGasto[] = [];
  auditoria: AuditoriaGasto[] = [];
  cierresMensuales: CierreMensual[] = [];
  fondoActivo: FondoCodigo = 'POLLO_GALLINA';
  vistaActiva: 'resumen' | 'gasto' | 'capital' | 'venta' | 'categorias' | 'trazabilidad' | 'cierre' = 'resumen';

  fechaDesde = this.inicioMesActual();
  fechaHasta = this.finMesActual();
  cargando = false;
  guardandoGasto = false;
  guardandoCapital = false;
  guardandoVenta = false;
  cerrandoMes = false;
  mensajeError = '';
  mensajeOk = '';

  gastoForm = {
    fondo: 'POLLO_GALLINA' as FondoCodigo,
    categoriaId: null as number | null,
    categoriaNombre: '',
    fecha: this.fechaHoy(),
    descripcion: '',
    monto: null as number | null,
    nota: ''
  };

  capitalForm = {
    fondo: 'POLLO_GALLINA' as FondoCodigo,
    fecha: this.fechaHoy(),
    descripcion: '',
    monto: null as number | null,
    nota: ''
  };

  ventaForm = {
    fecha: this.fechaHoy(),
    ventaPollo: 0,
    ventaGallina: 0,
    observacion: ''
  };
  ventaAcumulada: VentaPolloGallina | null = null;

  nuevaCategoria = '';
  cierreForm = {
    periodo: this.periodoActual(),
    observacion: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly confirmacionServicio: ConfirmacionServicio,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.cargando = true;
    this.mensajeError = '';

    const params = new HttpParams()
      .set('fecha_desde', this.fechaDesde)
      .set('fecha_hasta', this.fechaHasta)
      .set('fecha', this.ventaForm.fecha);

    this.http.get<ResumenGastosApi>('/api/gastos/resumen', { headers: this.obtenerHeaders(), params }).subscribe({
      next: (respuesta) => {
        this.fondos = Object.values(respuesta.fondos ?? {});
        this.movimientos = respuesta.movimientos ?? [];
        this.auditoria = respuesta.auditoria ?? [];
        this.cierresMensuales = respuesta.cierres_mensuales ?? [];
        this.categorias = respuesta.categorias ?? [];
        this.aplicarVentaRespuesta(respuesta.venta_pollo_gallina);
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = error?.error?.message || 'No se pudo cargar gastos.';
        this.cargando = false;
      }
    });
  }

  seleccionarFondo(fondo: FondoCodigo): void {
    this.fondoActivo = fondo;
    this.gastoForm.fondo = fondo;
    this.capitalForm.fondo = fondo;
  }

  cambiarVista(vista: 'resumen' | 'gasto' | 'capital' | 'venta' | 'categorias' | 'trazabilidad' | 'cierre'): void {
    this.vistaActiva = vista;
    this.mensajeError = '';
    this.mensajeOk = '';
  }

  guardarCapital(): void {
    this.mensajeError = '';
    this.mensajeOk = '';

    if (!this.capitalForm.descripcion.trim()) {
      this.mensajeError = 'Escribe el origen del capital.';
      return;
    }

    if (!this.capitalForm.monto || Number(this.capitalForm.monto) <= 0) {
      this.mensajeError = 'Ingresa un monto valido para el capital.';
      return;
    }

    this.guardandoCapital = true;
    this.http.post(
      '/api/gastos/capital',
      {
        fondo: this.capitalForm.fondo,
        fecha: this.capitalForm.fecha,
        descripcion: this.capitalForm.descripcion.trim(),
        monto: Number(this.capitalForm.monto),
        nota: this.capitalForm.nota.trim() || null
      },
      { headers: this.obtenerHeaders() }
    ).subscribe({
      next: (respuesta: any) => {
        this.guardandoCapital = false;
        this.mensajeOk = respuesta?.message || 'Capital agregado correctamente.';
        this.limpiarCapital();
        this.cargarResumen();
      },
      error: (error) => {
        this.guardandoCapital = false;
        this.mensajeError = error?.error?.message || 'No se pudo agregar el capital.';
      }
    });
  }

  guardarGasto(): void {
    this.mensajeError = '';
    this.mensajeOk = '';

    if (!this.gastoForm.descripcion.trim()) {
      this.mensajeError = 'Escribe el nombre del gasto.';
      return;
    }

    if (!this.gastoForm.monto || Number(this.gastoForm.monto) <= 0) {
      this.mensajeError = 'Ingresa un monto valido.';
      return;
    }

    this.guardandoGasto = true;
    this.http.post(
      '/api/gastos',
      {
        fondo: this.gastoForm.fondo,
        categoria_id: this.gastoForm.categoriaId,
        categoria_nombre: this.gastoForm.categoriaNombre.trim() || null,
        fecha: this.gastoForm.fecha,
        descripcion: this.gastoForm.descripcion.trim(),
        monto: Number(this.gastoForm.monto),
        nota: this.gastoForm.nota.trim() || null
      },
      { headers: this.obtenerHeaders() }
    ).subscribe({
      next: () => {
        this.guardandoGasto = false;
        this.mensajeOk = 'Gasto registrado correctamente.';
        this.limpiarGasto();
        this.cargarResumen();
      },
      error: (error) => {
        this.guardandoGasto = false;
        this.mensajeError = error?.error?.message || 'No se pudo registrar el gasto.';
      }
    });
  }

  guardarVentaPolloGallina(): void {
    this.guardandoVenta = true;
    this.mensajeError = '';
    this.mensajeOk = '';

    this.http.put<{ venta: VentaPolloGallina; message: string }>(
      '/api/gastos/venta-pollo-gallina',
      {
        fecha: this.ventaForm.fecha,
        venta_pollo: Number(this.ventaForm.ventaPollo || 0),
        venta_gallina: Number(this.ventaForm.ventaGallina || 0),
        observacion: this.ventaForm.observacion.trim() || null
      },
      { headers: this.obtenerHeaders() }
    ).subscribe({
      next: (respuesta) => {
        this.guardandoVenta = false;
        this.mensajeOk = respuesta.message || 'Venta guardada correctamente.';
        this.aplicarVentaRespuesta(respuesta.venta);
        this.limpiarVenta();
        this.cargarResumen();
      },
      error: (error) => {
        this.guardandoVenta = false;
        this.mensajeError = error?.error?.message || 'No se pudo guardar la venta.';
      }
    });
  }

  guardarCategoria(): void {
    const nombre = this.nuevaCategoria.trim();
    if (!nombre) {
      return;
    }

    this.http.post('/api/gastos/categorias', { nombre }, { headers: this.obtenerHeaders() }).subscribe({
      next: () => {
        this.nuevaCategoria = '';
        this.cargarResumen();
      },
      error: (error) => {
        this.mensajeError = error?.error?.message || 'No se pudo guardar la categoria.';
      }
    });
  }

  async cerrarMes(): Promise<void> {
    const confirmar = await this.confirmacionServicio.confirmar({
      titulo: 'Cerrar mes',
      mensaje: `Deseas cerrar el mes ${this.cierreForm.periodo}?`,
      detalle: 'Revisa ventas, gastos y capital antes de confirmar el cierre.',
      textoConfirmar: 'Cerrar mes',
      tipo: 'advertencia'
    });
    if (!confirmar) {
      return;
    }

    this.cerrandoMes = true;
    this.mensajeError = '';
    this.mensajeOk = '';

    this.http.post(
      '/api/gastos/cierre-mensual',
      {
        periodo: this.cierreForm.periodo,
        observacion: this.cierreForm.observacion.trim() || null
      },
      { headers: this.obtenerHeaders() }
    ).subscribe({
      next: (respuesta: any) => {
        this.cerrandoMes = false;
        this.mensajeOk = respuesta?.message || 'Mes cerrado correctamente.';
        this.cierreForm.observacion = '';
        this.cargarResumen();
      },
      error: (error) => {
        this.cerrandoMes = false;
        this.mensajeError = error?.error?.message || 'No se pudo cerrar el mes.';
      }
    });
  }

  anularGasto(movimiento: MovimientoGasto): void {
    if (movimiento.tipo === 'COMPRA') {
      this.mensajeError = 'Las compras se corrigen desde su modulo de origen.';
      return;
    }

    const etiqueta = movimiento.tipo === 'CAPITAL' ? 'capital' : 'gasto';
    const motivo = window.prompt(`Motivo para anular el ${etiqueta} "${movimiento.titulo}"`);
    if (!motivo?.trim()) {
      return;
    }

    const url = movimiento.tipo === 'CAPITAL'
      ? `/api/gastos/capital/${movimiento.id}/anular`
      : `/api/gastos/${movimiento.id}/anular`;

    this.http.patch(url, { motivo: motivo.trim() }, { headers: this.obtenerHeaders() }).subscribe({
      next: () => this.cargarResumen(),
      error: (error) => {
        this.mensajeError = error?.error?.message || `No se pudo anular el ${etiqueta}.`;
      }
    });
  }

  fondoActual(): FondoResumen | null {
    return this.fondos.find((fondo) => fondo.codigo === this.fondoActivo) ?? null;
  }

  movimientosDelFondo(): MovimientoGasto[] {
    return this.movimientos.filter((movimiento) => movimiento.fondo === this.fondoActivo);
  }

  auditoriaDelFondo(): AuditoriaGasto[] {
    return this.auditoria.filter((item) => !item.fondo || item.fondo === this.fondoActivo);
  }

  nombreFondo(codigo: FondoCodigo): string {
    return codigo === 'POLLO_GALLINA' ? 'Pollo + Gallina' : 'Congelados + Huevos';
  }

  totalVentaManual(): number {
    return Number(this.ventaForm.ventaPollo || 0) + Number(this.ventaForm.ventaGallina || 0);
  }

  totalVentaAcumulada(): number {
    return Number(this.ventaAcumulada?.venta_pollo ?? 0) + Number(this.ventaAcumulada?.venta_gallina ?? 0);
  }

  signoMovimiento(movimiento: MovimientoGasto): string {
    return movimiento.tipo === 'CAPITAL' ? '+' : '-';
  }

  claseMovimiento(movimiento: MovimientoGasto): string {
    return `movimiento--${movimiento.tipo.toLowerCase()}`;
  }

  puedeAnularMovimiento(movimiento: MovimientoGasto): boolean {
    return movimiento.estado !== 'ANULADO' && movimiento.tipo !== 'COMPRA';
  }

  aplicarMesActual(): void {
    this.fechaDesde = this.inicioMesActual();
    this.fechaHasta = this.finMesActual();
    this.cierreForm.periodo = this.periodoActual();
    this.cargarResumen();
  }

  private limpiarGasto(): void {
    this.gastoForm = {
      fondo: this.fondoActivo,
      categoriaId: null,
      categoriaNombre: '',
      fecha: this.fechaHoy(),
      descripcion: '',
      monto: null,
      nota: ''
    };
  }

  private limpiarCapital(): void {
    this.capitalForm = {
      fondo: this.fondoActivo,
      fecha: this.fechaHoy(),
      descripcion: '',
      monto: null,
      nota: ''
    };
  }

  private aplicarVentaRespuesta(venta: VentaPolloGallina | null): void {
    this.ventaAcumulada = venta;
    if (venta?.fecha) {
      this.ventaForm.fecha = venta.fecha;
    }
  }

  private limpiarVenta(): void {
    this.ventaForm.ventaPollo = 0;
    this.ventaForm.ventaGallina = 0;
    this.ventaForm.observacion = '';
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    let headers = new HttpHeaders({ Accept: 'application/json' });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private fechaHoy(): string {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - offset).toISOString().slice(0, 10);
  }

  private inicioMesActual(): string {
    const hoy = this.fechaHoy();
    return `${hoy.slice(0, 8)}01`;
  }

  private finMesActual(): string {
    const ahora = new Date();
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    const offset = fin.getTimezoneOffset() * 60000;
    return new Date(fin.getTime() - offset).toISOString().slice(0, 10);
  }

  private periodoActual(): string {
    return this.fechaHoy().slice(0, 7);
  }
}
