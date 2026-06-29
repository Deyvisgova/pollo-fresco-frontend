import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface RegistroEntrega {
  entrega_id: number;
  proveedor_id: number;
  proveedor?: { nombres: string; apellidos: string | null; ruc: string | null; dni: string | null; nombre_empresa: string | null };
  usuario_id: number;
  fecha_hora: string;
  cantidad_pollos: number;
  peso_total_kg: number;
  merma_kg: number;
  costo_total: number;
  tipo: string | null;
  estado_pago: 'PENDIENTE' | 'PAGADO';
  creado_en: string;
}

interface ProveedorApi {
  proveedor_id: number;
  nombres: string;
  apellidos: string | null;
  ruc: string | null;
  dni: string | null;
  nombre_empresa: string | null;
}

interface RegistroLinea {
  tipoAve: string;
  cantidadPollos: number | null;
  pesoTotalKg: number | null;
  mermaKg: number | null;
  precioKg: number | null;
  horaEntrega: string;
}

interface TarjetaProveedor {
  proveedor: ProveedorApi;
  lineas: RegistroLinea[];
  estadoPago: 'PENDIENTE' | 'PAGADO';
  guardando: boolean;
  error: string;
  expandida: boolean;
}

interface FiltrosHistorial {
  texto: string;
  proveedorId: string;
  tipo: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
}

interface PagoProveedor {
  pago_id: number;
  total: number;
  monto_transferencia: number;
  monto_efectivo: number;
  saldo: number;
  estado: string;
  cantidad_entregas: number;
  creado_en: string;
}

@Component({
  selector: 'app-privado-proveedores-registros',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './proveedores-registros.html',
  styleUrl: './proveedores-registros.css'
})
export class PrivadoProveedoresRegistros implements OnInit, OnDestroy {
  readonly tiposAveDisponibles = ['POLLO', 'GALLINA'];
  private readonly storageTarjetasKey = 'proveedores_registros_tarjetas';
  private temporizadorBusquedaProveedor: ReturnType<typeof setTimeout> | null = null;
  private temporizadorPersistenciaTarjetas: ReturnType<typeof setTimeout> | null = null;
  private secuenciaBusquedaProveedor = 0;

  registros: RegistroEntrega[] = [];
  registrosFiltrados: RegistroEntrega[] = [];
  registrosPendientesFiltrados: RegistroEntrega[] = [];
  proveedores: ProveedorApi[] = [];
  proveedoresHistorial: ProveedorApi[] = [];
  busquedaProveedor = '';
  tarjetasProveedor: TarjetaProveedor[] = [];

  fechaEntrega = '';
  usuarioNombre = 'Usuario';
  usuarioId = 0;

  filtros: FiltrosHistorial = {
    texto: '',
    proveedorId: '',
    tipo: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  };

  totalFiltrado = 0;
  modalPagoAbierto = false;
  montoTransferencia: number | null = null;
  montoEfectivo: number | null = null;
  procesandoPago = false;
  entregasParaPagarIds: number[] = [];
  errorPagoModal = '';

  editandoEntregaId: number | null = null;
  formularioEdicion: {
    tipo: string;
    cantidad_pollos: number | null;
    peso_total_kg: number | null;
    merma_kg: number | null;
    costo_total: number | null;
    fecha_hora: string;
  } = {
    tipo: 'POLLO',
    cantidad_pollos: null,
    peso_total_kg: null,
    merma_kg: null,
    costo_total: null,
    fecha_hora: ''
  };

  cargando = false;
  guardandoEdicion = false;
  error = '';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.fechaEntrega = this.obtenerFechaActual();
    this.usuarioNombre = this.sesionServicio.obtenerUsuario()?.name ?? 'Usuario';
    this.usuarioId = this.sesionServicio.obtenerUsuario()?.id ?? 0;
    this.recuperarTarjetas();
    this.cargarRegistros();
  }

  get esVendedor(): boolean {
    return this.sesionServicio.usuarioEsRol('vendedor');
  }

  ngOnDestroy(): void {
    if (this.temporizadorBusquedaProveedor) {
      clearTimeout(this.temporizadorBusquedaProveedor);
    }

    if (this.temporizadorPersistenciaTarjetas) {
      clearTimeout(this.temporizadorPersistenciaTarjetas);
      this.guardarTarjetasEnStorage();
    }
  }

  buscarProveedor(): void {
    const termino = this.busquedaProveedor.trim();
    this.secuenciaBusquedaProveedor += 1;

    if (this.temporizadorBusquedaProveedor) {
      clearTimeout(this.temporizadorBusquedaProveedor);
    }

    if (!termino) {
      this.proveedores = [];
      return;
    }

    const secuenciaActual = this.secuenciaBusquedaProveedor;
    this.temporizadorBusquedaProveedor = setTimeout(() => {
      const headers = this.obtenerHeaders();
      this.http
        .get<ProveedorApi[]>(`/api/proveedores?search=${encodeURIComponent(termino)}`, { headers })
        .subscribe({
          next: (proveedores) => {
            if (secuenciaActual === this.secuenciaBusquedaProveedor) {
              this.proveedores = proveedores;
            }
          },
          error: () => {
            this.error = 'No se pudo buscar proveedores.';
          }
        });
    }, 280);
  }

  seleccionarProveedor(proveedor: ProveedorApi): void {
    const yaExiste = this.tarjetasProveedor.some(
      (tarjeta) => tarjeta.proveedor.proveedor_id === proveedor.proveedor_id
    );

    if (!yaExiste) {
      this.tarjetasProveedor = [
        ...this.tarjetasProveedor,
        {
          proveedor,
          lineas: [this.crearLineaInicial()],
          estadoPago: 'PENDIENTE',
          guardando: false,
          error: '',
          expandida: true
        }
      ];
      this.persistirTarjetas();
    }

    this.busquedaProveedor = '';
    this.proveedores = [];
  }

  alternarTarjeta(proveedorId: number): void {
    const tarjeta = this.obtenerTarjeta(proveedorId);
    if (!tarjeta) {
      return;
    }

    tarjeta.expandida = !tarjeta.expandida;
    this.persistirTarjetas();
  }

  cerrarTarjeta(proveedorId: number): void {
    this.tarjetasProveedor = this.tarjetasProveedor.filter((tarjeta) => tarjeta.proveedor.proveedor_id !== proveedorId);
    this.persistirTarjetas();
  }

  agregarLinea(proveedorId: number): void {
    const tarjeta = this.obtenerTarjeta(proveedorId);
    if (!tarjeta) {
      return;
    }

    tarjeta.lineas = [...tarjeta.lineas, this.crearLineaInicial()];
    this.persistirTarjetas();
  }

  eliminarLinea(proveedorId: number, indice: number): void {
    const tarjeta = this.obtenerTarjeta(proveedorId);
    if (!tarjeta) {
      return;
    }

    tarjeta.lineas = tarjeta.lineas.filter((_, posicion) => posicion !== indice);

    if (tarjeta.lineas.length === 0) {
      tarjeta.lineas = [this.crearLineaInicial()];
    }

    this.persistirTarjetas();
  }

  guardarRegistro(proveedorId: number): void {
    this.error = '';

    if (this.usuarioId === 0) {
      this.error = 'No se encontro usuario autenticado.';
      return;
    }

    const tarjeta = this.obtenerTarjeta(proveedorId);
    if (!tarjeta) {
      return;
    }

    const lineasValidas = tarjeta.lineas.filter((linea) => (linea.pesoTotalKg ?? 0) > 0);

    if (lineasValidas.length === 0) {
      tarjeta.error = 'Ingresa al menos una linea con peso mayor a 0.';
      return;
    }

    tarjeta.error = '';
    tarjeta.guardando = true;

    const headers = this.obtenerHeaders();
    const requests = lineasValidas.map((linea) => {
      const cantidad = linea.cantidadPollos ?? 0;
      const peso = linea.pesoTotalKg ?? 0;
      const mermaPorPollo = this.esVendedor ? 0 : linea.mermaKg ?? 0;
      const precio = this.esVendedor ? 0 : linea.precioKg ?? 0;
      const mermaTotal = cantidad * mermaPorPollo;

      const payload = {
        proveedor_id: tarjeta.proveedor.proveedor_id,
        usuario_id: this.usuarioId,
        fecha_hora: this.construirFechaHora(linea.horaEntrega),
        cantidad_pollos: cantidad,
        peso_total_kg: peso,
        merma_kg: mermaTotal,
        costo_total: (peso + mermaTotal) * precio,
        tipo: linea.tipoAve
        ,estado_pago: this.esVendedor ? 'PENDIENTE' : tarjeta.estadoPago
      };

      return this.http.post<RegistroEntrega>('/api/entregas-proveedor', payload, { headers });
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.cerrarTarjeta(proveedorId);
        this.cargarRegistros();
      },
      error: () => {
        tarjeta.error = 'No se pudo guardar la entrega.';
      },
      complete: () => {
        tarjeta.guardando = false;
      }
    });
  }

  limpiarFormulario(proveedorId: number): void {
    const tarjeta = this.obtenerTarjeta(proveedorId);
    if (!tarjeta) {
      return;
    }

    tarjeta.lineas = [this.crearLineaInicial()];
    tarjeta.error = '';
    this.persistirTarjetas();
  }

  aplicarFiltros(): void {
    const texto = this.filtros.texto.trim().toLowerCase();

    this.registrosFiltrados = this.registros.filter((registro) => {
      const nombreProveedor = `${registro.proveedor?.nombres ?? ''} ${registro.proveedor?.apellidos ?? ''}`.toLowerCase();
      const documento = (registro.proveedor?.ruc || registro.proveedor?.dni || '').toLowerCase();
      const tipo = (registro.tipo || '').toLowerCase();

      const pasaTexto =
        !texto ||
        nombreProveedor.includes(texto) ||
        documento.includes(texto) ||
        tipo.includes(texto);

      const pasaProveedor =
        !this.filtros.proveedorId ||
        String(registro.proveedor_id) === this.filtros.proveedorId;

      const pasaTipo = !this.filtros.tipo || (registro.tipo || '') === this.filtros.tipo;
      const pasaEstado = !this.filtros.estado || this.normalizarEstadoPago(registro.estado_pago) === this.filtros.estado;

      const fechaRegistro = registro.fecha_hora.slice(0, 10);
      const pasaFechaDesde = !this.filtros.fechaDesde || fechaRegistro >= this.filtros.fechaDesde;
      const pasaFechaHasta = !this.filtros.fechaHasta || fechaRegistro <= this.filtros.fechaHasta;

      return pasaTexto && pasaProveedor && pasaTipo && pasaEstado && pasaFechaDesde && pasaFechaHasta;
    });

    this.registrosPendientesFiltrados = this.registrosFiltrados.filter((registro) => this.normalizarEstadoPago(registro.estado_pago) === 'PENDIENTE');
    this.totalFiltrado = this.registrosPendientesFiltrados.reduce((acumulado, registro) => acumulado + Number(registro.costo_total), 0);
  }

  limpiarFiltros(): void {
    this.filtros = {
      texto: '',
      proveedorId: '',
      tipo: '',
      estado: '',
      fechaDesde: '',
      fechaHasta: ''
    };
    this.aplicarFiltros();
  }

  alternarEstadoRegistro(registro: RegistroEntrega): void {
    if (this.esVendedor) {
      return;
    }

    const headers = this.obtenerHeaders();
    const nuevoEstado = registro.estado_pago === 'PAGADO' ? 'PENDIENTE' : 'PAGADO';

    const payload = {
      tipo: registro.tipo || 'POLLO',
      cantidad_pollos: registro.cantidad_pollos,
      peso_total_kg: registro.peso_total_kg,
      merma_kg: registro.merma_kg,
      costo_total: registro.costo_total,
      fecha_hora: this.formatearFechaHoraInput(registro.fecha_hora).replace('T', ' ') + ':00',
      estado_pago: nuevoEstado
    };

    this.http.put(`/api/entregas-proveedor/${registro.entrega_id}`, payload, { headers }).subscribe({
      next: () => this.cargarRegistros(),
      error: () => {
        this.error = 'No se pudo actualizar el estado del registro.';
      }
    });
  }

  abrirModalPago(registro?: RegistroEntrega, evento?: Event): void {
    if (this.esVendedor) {
      return;
    }

    evento?.preventDefault();
    evento?.stopPropagation();

    this.error = '';
    this.errorPagoModal = '';
    this.entregasParaPagarIds = registro
      ? (this.esPendiente(registro) ? [registro.entrega_id] : [])
      : this.registrosPendientesFiltrados.map((fila) => fila.entrega_id);

    if (!registro && this.contarProveedoresSeleccionados() > 1) {
      this.mostrarAlertaProveedorUnico();
      return;
    }

    this.modalPagoAbierto = true;
    this.montoTransferencia = null;
    this.montoEfectivo = null;

    if (this.entregasParaPagarIds.length === 0 || this.totalPagoActual() === 0) {
      this.errorPagoModal = 'No hay entregas pendientes para pagar con el filtro actual.';
    }
  }

  cerrarModalPago(): void {
    this.modalPagoAbierto = false;
    this.entregasParaPagarIds = [];
    this.errorPagoModal = '';
  }


  @HostListener('document:keydown.escape')
  cerrarModalConEscape(): void {
    if (!this.modalPagoAbierto) {
      return;
    }

    this.cerrarModalPago();
  }

  totalPagoActual(): number {
    const ids = new Set(this.entregasParaPagarIds);
    const total = this.registros
      .filter((registro) => ids.has(registro.entrega_id) && this.normalizarEstadoPago(registro.estado_pago) === 'PENDIENTE')
      .reduce((acumulado, registro) => acumulado + Number(registro.costo_total), 0);

    return Number(total.toFixed(2));
  }

  saldoPago(): number {
    const transferencia = Number(this.montoTransferencia ?? 0);
    const efectivo = Number(this.montoEfectivo ?? 0);
    return Number((this.totalPagoActual() - transferencia - efectivo).toFixed(2));
  }

  pagoCompleto(): boolean {
    return Math.abs(this.saldoPago()) < 0.01;
  }

  puedePagarTodo(): boolean {
    return this.pagoCompleto() && this.entregasParaPagarIds.length > 0 && this.totalPagoActual() > 0;
  }

  esPendiente(registro: RegistroEntrega): boolean {
    return this.normalizarEstadoPago(registro.estado_pago) === 'PENDIENTE';
  }

  esPagado(registro: RegistroEntrega): boolean {
    return this.normalizarEstadoPago(registro.estado_pago) === 'PAGADO';
  }

  pagarTodo(): void {
    if (!this.puedePagarTodo() || this.usuarioId === 0) {
      return;
    }

    if (this.contarProveedoresSeleccionados() > 1) {
      this.errorPagoModal = 'Solo se permite pagar de un solo proveedor.';
      return;
    }

    const headers = this.obtenerHeaders();
    const payload = {
      usuario_id: this.usuarioId,
      entregas_ids: this.entregasParaPagarIds,
      monto_transferencia: Number(this.montoTransferencia ?? 0),
      monto_efectivo: Number(this.montoEfectivo ?? 0),
      fecha_desde: this.filtros.fechaDesde || null,
      fecha_hasta: this.filtros.fechaHasta || null
    };

    this.procesandoPago = true;
    this.http.post<PagoProveedor>('/api/pagos-proveedor', payload, { headers }).subscribe({
      next: () => {
        this.cerrarModalPago();
        this.cargarRegistros();
      },
      error: () => {
        this.errorPagoModal = 'No se pudo registrar el pago total.';
      },
      complete: () => {
        this.procesandoPago = false;
      }
    });
  }


  private mostrarAlertaProveedorUnico(): void {
    const swal = (window as unknown as { Swal?: { fire: (options: Record<string, unknown>) => Promise<{ isConfirmed: boolean }> } }).Swal;

    if (!swal) {
      this.error = 'Solo se permite pagar de un solo proveedor.';
      return;
    }

    swal.fire({
      title: 'Atencion',
      text: 'Solo se permite pagar de un solo proveedor.',
      icon: 'warning',
      confirmButtonText: 'OK'
    });
  }

  private contarProveedoresSeleccionados(): number {
    const ids = new Set(this.entregasParaPagarIds);
    const proveedores = new Set(
      this.registros
        .filter((registro) => ids.has(registro.entrega_id))
        .map((registro) => registro.proveedor_id)
    );

    return proveedores.size;
  }

  trackByProveedor(_indice: number, proveedor: ProveedorApi): number {
    return proveedor.proveedor_id;
  }

  trackByTarjetaProveedor(_indice: number, tarjeta: TarjetaProveedor): number {
    return tarjeta.proveedor.proveedor_id;
  }

  trackByRegistro(_indice: number, registro: RegistroEntrega): number {
    return registro.entrega_id;
  }

  trackByLinea(indice: number): number {
    return indice;
  }

  private actualizarProveedoresHistorial(): void {
    const mapa = new Map<number, ProveedorApi>();

    this.registros.forEach((registro) => {
      if (!registro.proveedor) {
        return;
      }

      if (!mapa.has(registro.proveedor_id)) {
        mapa.set(registro.proveedor_id, {
          proveedor_id: registro.proveedor_id,
          nombres: registro.proveedor.nombres,
          apellidos: registro.proveedor.apellidos,
          ruc: registro.proveedor.ruc,
          dni: registro.proveedor.dni,
          nombre_empresa: registro.proveedor.nombre_empresa
        });
      }
    });

    this.proveedoresHistorial = Array.from(mapa.values()).sort((a, b) => a.nombres.localeCompare(b.nombres));
  }

  iniciarEdicion(registro: RegistroEntrega): void {
    if (this.esVendedor) {
      return;
    }

    this.editandoEntregaId = registro.entrega_id;
    this.formularioEdicion = {
      tipo: registro.tipo || 'POLLO',
      cantidad_pollos: registro.cantidad_pollos,
      peso_total_kg: registro.peso_total_kg,
      merma_kg: registro.merma_kg,
      costo_total: registro.costo_total,
      fecha_hora: this.formatearFechaHoraInput(registro.fecha_hora)
    };
  }

  cancelarEdicion(): void {
    this.editandoEntregaId = null;
  }

  guardarEdicion(entregaId: number): void {
    if (!this.formularioEdicion.fecha_hora) {
      this.error = 'La fecha y hora de edicion es obligatoria.';
      return;
    }

    this.guardandoEdicion = true;
    const headers = this.obtenerHeaders();

    const payload = {
      tipo: this.formularioEdicion.tipo,
      cantidad_pollos: this.formularioEdicion.cantidad_pollos ?? 0,
      peso_total_kg: this.formularioEdicion.peso_total_kg ?? 0,
      merma_kg: this.formularioEdicion.merma_kg ?? 0,
      costo_total: this.formularioEdicion.costo_total ?? 0,
      fecha_hora: this.formularioEdicion.fecha_hora.replace('T', ' ') + ':00',
      estado_pago: this.registros.find((registro) => registro.entrega_id === entregaId)?.estado_pago ?? 'PENDIENTE'
    };

    this.http.put(`/api/entregas-proveedor/${entregaId}`, payload, { headers }).subscribe({
      next: () => {
        this.editandoEntregaId = null;
        this.cargarRegistros();
      },
      error: () => {
        this.error = 'No se pudo actualizar la fila.';
      },
      complete: () => {
        this.guardandoEdicion = false;
      }
    });
  }

  eliminarRegistro(entregaId: number): void {
    if (this.esVendedor) {
      return;
    }

    const headers = this.obtenerHeaders();

    this.http.delete(`/api/entregas-proveedor/${entregaId}`, { headers }).subscribe({
      next: () => {
        if (this.editandoEntregaId === entregaId) {
          this.editandoEntregaId = null;
        }
        this.cargarRegistros();
      },
      error: () => {
        this.error = 'No se pudo eliminar la fila.';
      }
    });
  }

  private cargarRegistros(): void {
    this.cargando = true;
    const headers = this.obtenerHeaders();
    this.http.get<RegistroEntrega[]>('/api/entregas-proveedor', { headers }).subscribe({
      next: (registros) => {
        this.registros = registros.map((registro) => ({
          ...registro,
          estado_pago: this.normalizarEstadoPago(registro.estado_pago),
        }));
        this.actualizarProveedoresHistorial();
        this.aplicarFiltros();
      },
      error: () => {
        this.error = 'No se pudo cargar el historial de entregas.';
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }

  private crearLineaInicial(): RegistroLinea {
    return {
      tipoAve: this.tiposAveDisponibles[0],
      cantidadPollos: null,
      pesoTotalKg: null,
      mermaKg: null,
      precioKg: null,
      horaEntrega: this.obtenerHoraActual()
    };
  }

  private obtenerHoraActual(): string {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  private construirFechaHora(horaEntrega: string): string {
    return `${this.fechaEntrega} ${horaEntrega}:00`;
  }

  private obtenerTarjeta(proveedorId: number): TarjetaProveedor | undefined {
    return this.tarjetasProveedor.find((tarjeta) => tarjeta.proveedor.proveedor_id === proveedorId);
  }

  private obtenerFechaActual(): string {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatearFechaExacta(fechaHora: string): string {
    const valor = String(fechaHora ?? '').trim();
    if (!valor) {
      return '-';
    }

    const coincidencia = valor.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!coincidencia) {
      return valor;
    }

    const [, year, month, day, hourRaw, minute, secondRaw] = coincidencia;
    const hour = Number(hourRaw);
    const second = secondRaw ?? '00';
    const periodo = hour >= 12 ? 'p. m.' : 'a. m.';
    const hour12 = ((hour + 11) % 12) + 1;
    const hora = String(hour12).padStart(2, '0');

    return `${day}/${month}/${year}, ${hora}:${minute}:${second} ${periodo}`;
  }

  persistirTarjetas(): void {
    if (this.temporizadorPersistenciaTarjetas) {
      clearTimeout(this.temporizadorPersistenciaTarjetas);
    }

    this.temporizadorPersistenciaTarjetas = setTimeout(() => {
      this.guardarTarjetasEnStorage();
      this.temporizadorPersistenciaTarjetas = null;
    }, 250);
  }

  private guardarTarjetasEnStorage(): void {
    localStorage.setItem(this.storageTarjetasKey, JSON.stringify(this.tarjetasProveedor));
  }

  private recuperarTarjetas(): void {
    const contenido = localStorage.getItem(this.storageTarjetasKey);
    if (!contenido) {
      return;
    }

    try {
      const tarjetas: TarjetaProveedor[] = JSON.parse(contenido);
      this.tarjetasProveedor = tarjetas.map((tarjeta) => ({
        ...tarjeta,
        guardando: false,
        error: tarjeta.error ?? '',
        expandida: tarjeta.expandida !== false,
        estadoPago: this.normalizarEstadoPago(tarjeta.estadoPago),
        lineas: (tarjeta.lineas && tarjeta.lineas.length > 0 ? tarjeta.lineas : [this.crearLineaInicial()])
      }));
    } catch {
      this.tarjetasProveedor = [];
      localStorage.removeItem(this.storageTarjetasKey);
    }
  }


  private normalizarEstadoPago(estado: string | null | undefined): 'PENDIENTE' | 'PAGADO' {
    const estadoNormalizado = String(estado ?? '').trim().toUpperCase();
    return estadoNormalizado === 'PAGADO' ? 'PAGADO' : 'PENDIENTE';
  }

  private formatearFechaHoraInput(fechaHora: string): string {
    const fecha = new Date(fechaHora);
    if (Number.isNaN(fecha.getTime())) {
      return '';
    }

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
