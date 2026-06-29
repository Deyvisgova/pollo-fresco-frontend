import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpClientModule,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type * as Leaflet from 'leaflet';
import { SesionServicio } from '../../../servicios/sesion.servicio';

interface PedidoCliente {
  cliente_id: number;
  dni: string | null;
  ruc: string | null;
  nombres: string;
  apellidos: string | null;
  nombre_empresa: string | null;
  celular: string | null;
  direccion: string | null;
  direccion_fiscal: string | null;
  referencias: string | null;
  latitud?: number | null;
  longitud?: number | null;
  foto_frontis_url?: string | null;
  ubicacion_actualizada_en?: string | null;
}

interface PedidoDetalleApi {
  cantidad: number;
  unidad: string;
  descripcion: string;
  precio_unitario: number;
  subtotal: number;
}

interface PedidoPago {
  pedido_pago_id: number;
  estado_pago: 'COMPLETO' | 'PENDIENTE' | 'PARCIAL';
  pago_parcial: number | null;
  vuelto: number;
  fecha_hora: string | null;
}

interface PedidoDelivery {
  pedido_id: number;
  estado_id: 1 | 2 | 3 | 4 | 5;
  tipo_pedido: 'MESA' | 'DELIVERY' | null;
  mesa: string | null;
  fecha_hora_creacion: string;
  motivo_cancelacion: string | null;
  latitud: number | null;
  longitud: number | null;
  foto_frontis_url: string | null;
  total: number;
  monto_pagado?: number;
  saldo_pendiente?: number;
  estado_pago_calculado?: 'COMPLETO' | 'PENDIENTE' | 'PARCIAL';
  cliente: PedidoCliente;
  detalles: PedidoDetalleApi[];
  pagos: PedidoPago[];
  delivery_usuario_id?: number | null;
  comprobante?: {
    comprobante_venta_id: number;
    tipo_comprobante: string;
    serie: string;
    numero: string;
    estado_sunat: string;
  } | null;
}

interface PuntoRutaDelivery {
  pedido: PedidoDelivery;
  latitud: number;
  longitud: number;
  orden: number;
  distanciaKm: number | null;
}

interface CuentaPagoHistorial {
  pedido_pago_id: number;
  pedido_id: number;
  fecha_hora: string | null;
  dia_nombre: string | null;
  monto: number;
  estado_pago: 'COMPLETO' | 'PENDIENTE' | 'PARCIAL';
  tipo_pedido: 'MESA' | 'DELIVERY' | null;
  mesa: string | null;
  registrado_por: string;
}

interface CuentaCliente {
  cliente: PedidoCliente;
  total_deuda: number;
  monto_pagado: number;
  saldo_pendiente: number;
  cantidad_pedidos_pendientes: number;
  fecha_deuda_mas_antigua: string | null;
  ultimo_pago: CuentaPagoHistorial | null;
  pedidos: PedidoDelivery[];
  historial_pagos: CuentaPagoHistorial[];
}

interface DetalleFormulario {
  cantidad: number;
  unidad: 'KG' | 'UND';
  descripcion: string;
  precioUnitario: number;
  productoId?: number | null;
  grupoVenta?: 'HUEVOS' | 'CONGELADO' | 'OTROS' | null;
  presentacionVenta?: PresentacionHuevo;
}

interface ClienteFormulario {
  cliente_id: number | null;
  dni: string;
  ruc: string;
  nombres: string;
  apellidos: string;
  nombreEmpresa: string;
  celular: string;
  direccion: string;
  direccionFiscal: string;
  referencias: string;
}

interface ProductoApi {
  id: number;
  nombre: string;
  grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

type PresentacionHuevo =
  | 'UNIDAD'
  | 'MEDIO_CASILLERO'
  | 'CASILLERO'
  | 'MEDIA_JAVA'
  | 'JAVA';

interface LoteApi {
  producto_id: number;
  cantidad: number;
  estado: 'ABIERTO' | 'CERRADO';
}

interface EstadoVentaDiariaPedidoApi {
  filas: Array<{
    producto_id: number;
    cantidad: number;
    precio: number;
    fecha_hora: string;
    cerrado_en: string | null;
    pedido_id?: number | null;
    origen?: string | null;
    presentacion_venta?: PresentacionHuevo | null;
    cantidad_presentacion?: number | null;
  }>;
}

@Component({
  selector: 'app-privado-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css',
})
export class PrivadoPedidos implements OnInit, OnDestroy, AfterViewChecked {
  private token =
    'f3ba6fa1f3a2b2d1a6390dc06d831ebad2f218a9d3ba43e7f1f42b425dd03e26';

  subpaginaActiva: 'registrar' | 'registros' | 'cuentas' | 'delivery' =
    'registrar';
  vistaDeliveryActiva: 'hoy' | 'cobros' = 'hoy';
  private solicitudPedidosId = 0;

  pedidos: PedidoDelivery[] = [];
  pedidosFiltrados: PedidoDelivery[] = [];
  cuentasPorCobrar: CuentaCliente[] = [];
  cuentasFiltradas: CuentaCliente[] = [];
  cobrosAtrasadosDelivery: CuentaCliente[] = [];
  pedidoSeleccionado: PedidoDelivery | null = null;
  pedidoDetalleModal: PedidoDelivery | null = null;
  pedidoPagoPendiente: PedidoDelivery | null = null;
  cuentaClienteSeleccionada: CuentaCliente | null = null;
  cuentaPagoPendiente: CuentaCliente | null = null;
  montoPagoCuenta: number | null = null;

  terminoCliente = '';
  clientesSugeridos: PedidoCliente[] = [];
  clienteSeleccionado: PedidoCliente | null = null;

  fechaHoraCreacion = '';
  tipoPedidoFormulario: 'MESA' | 'DELIVERY' = 'DELIVERY';
  mesaFormulario = '';
  detalles: DetalleFormulario[] = [this.crearDetalleVacio()];
  productoSeleccionado = '';
  productosDisponibles: ProductoApi[] = [];
  productosFiltrados: string[] = [];
  stockDisponiblePorProducto = new Map<number, number>();
  indiceFilaPreferida: number | null = 0;

  mostrarModalCliente = false;
  consultaDocumento = '';
  consultaCargando = false;
  guardandoCliente = false;
  formularioCliente: ClienteFormulario = this.crearFormularioCliente();

  estadoDestino: 2 | 3 | 4 | 5 = 2;
  motivoCancelacion = '';
  montoRecibido: number | null = null;
  latitud: number | null = null;
  longitud: number | null = null;
  fotoFrontisUrl = '';
  referenciasUbicacion = '';
  fotoFrontisArchivo: File | null = null;
  fotoFrontisInfo = '';
  comprimiendoFotoFrontis = false;
  fotoFrontisLightboxUrl = '';

  cargando = false;
  guardandoPedido = false;
  guardandoEstado = false;
  registrandoPago = false;
  guardandoGestion = false;
  guardandoUbicacion = false;
  mensajeError = '';
  filtro = '';
  filtroCobrosAtrasados = '';
  filtroClienteRegistros = '';
  filtroFechaDesdeRegistros = '';
  filtroFechaHastaRegistros = '';
  filtroEstadoRegistros = '';
  filtroEstadoPagoRegistros = '';
  private readonly claveVueltosPagados = 'pedidos_delivery_vueltos_pagados';
  presentacionesHuevo = [
    { id: 'UNIDAD' as PresentacionHuevo, etiqueta: 'Unidad', factor: 1 },
    {
      id: 'MEDIO_CASILLERO' as PresentacionHuevo,
      etiqueta: 'Medio casillero',
      factor: 15,
    },
    { id: 'CASILLERO' as PresentacionHuevo, etiqueta: 'Casillero', factor: 30 },
    {
      id: 'MEDIA_JAVA' as PresentacionHuevo,
      etiqueta: 'Media java',
      factor: 180,
    },
    { id: 'JAVA' as PresentacionHuevo, etiqueta: 'Java', factor: 360 },
  ];
  private vueltosPagados = new Set<number>();
  private reinicioVistaDeliveryTimer: ReturnType<typeof setTimeout> | null =
    null;
  @ViewChild('mapaDeliveryContenedor')
  private mapaDeliveryContenedor?: ElementRef<HTMLDivElement>;
  mostrarMapaDelivery = false;
  puntosRutaDelivery: PuntoRutaDelivery[] = [];
  pedidosSinUbicacionRuta: PedidoDelivery[] = [];
  ubicacionActualDelivery: { latitud: number; longitud: number } | null = null;
  cargandoUbicacionRuta = false;
  private leafletLib: typeof Leaflet | null = null;
  private mapaDelivery: Leaflet.Map | null = null;
  private capaMarcadoresDelivery: Leaflet.LayerGroup | null = null;
  private necesitaRenderMapaDelivery = false;

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarVueltosPagados();
    this.fechaHoraCreacion = this.fechaActualIsoLocal();
    this.programarReinicioVistaDelivery();

    if (this.usuarioEsDelivery()) {
      this.subpaginaActiva = 'delivery';
      this.cargarPedidos('delivery');
      this.cargarCobrosAtrasadosDelivery();
      return;
    }

    if (!this.usuarioEsVendedor()) {
      this.cargarPedidos('vendedor');
    }
    this.cargarProductos();
    this.cargarStockDisponible();
  }

  ngOnDestroy(): void {
    if (this.reinicioVistaDeliveryTimer !== null) {
      clearTimeout(this.reinicioVistaDeliveryTimer);
      this.reinicioVistaDeliveryTimer = null;
    }
    this.destruirMapaDelivery();
  }

  ngAfterViewChecked(): void {
    if (this.necesitaRenderMapaDelivery && this.mapaDeliveryContenedor) {
      this.necesitaRenderMapaDelivery = false;
      this.renderizarMapaDelivery();
    }
  }

  cambiarSubpagina(
    subpagina: 'registrar' | 'registros' | 'cuentas' | 'delivery',
  ): void {
    if (this.usuarioEsDelivery()) {
      this.subpaginaActiva = 'delivery';
      this.cargarPedidos('delivery');
      this.cargarCobrosAtrasadosDelivery();
      return;
    }

    if (this.usuarioEsVendedor()) {
      this.subpaginaActiva = 'registrar';
      return;
    }

    this.subpaginaActiva = subpagina;
    this.pedidoSeleccionado = null;
    this.pedidoDetalleModal = null;
    this.pedidoPagoPendiente = null;
    this.cuentaClienteSeleccionada = null;
    this.cuentaPagoPendiente = null;

    if (subpagina === 'registros') {
      this.cargarPedidos('vendedor');
      return;
    }

    if (subpagina === 'cuentas') {
      this.cargarCuentasPorCobrar();
      return;
    }

    if (subpagina === 'delivery') {
      this.cargarPedidos('delivery');
      this.cargarCobrosAtrasadosDelivery();
    }
  }

  cargarPedidos(rol: 'vendedor' | 'delivery'): void {
    const solicitudActual = ++this.solicitudPedidosId;
    this.cargando = true;
    this.http
      .get<
        PedidoDelivery[]
      >(`/api/pedidos-delivery?rol=${rol}`, { headers: this.obtenerHeaders() })
      .subscribe({
        next: (pedidos) => {
          if (solicitudActual !== this.solicitudPedidosId) {
            return;
          }
          this.pedidos = pedidos;
          this.aplicarFiltro();
          this.cargando = false;
        },
        error: (error) => {
          if (solicitudActual !== this.solicitudPedidosId) {
            return;
          }
          this.pedidos = [];
          this.pedidosFiltrados = [];
          this.cargando = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo cargar pedidos.',
          );
        },
      });
  }

  cargarCuentasPorCobrar(): void {
    const solicitudActual = ++this.solicitudPedidosId;
    this.cargando = true;
    this.http
      .get<
        CuentaCliente[]
      >('/api/cuentas-por-cobrar', { headers: this.obtenerHeaders() })
      .subscribe({
        next: (cuentas) => {
          if (solicitudActual !== this.solicitudPedidosId) {
            return;
          }
          this.cuentasPorCobrar = cuentas;
          this.pedidos = cuentas.flatMap((cuenta) => cuenta.pedidos ?? []);
          this.aplicarFiltro();
          this.cargando = false;
        },
        error: (error) => {
          if (solicitudActual !== this.solicitudPedidosId) {
            return;
          }
          this.pedidos = [];
          this.pedidosFiltrados = [];
          this.cargando = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo cargar cuentas por cobrar.',
          );
        },
      });
  }

  cargarCobrosAtrasadosDelivery(): void {
    this.http
      .get<
        CuentaCliente[]
      >('/api/pedidos-delivery/cobros-atrasados', { headers: this.obtenerHeaders() })
      .subscribe({
        next: (cuentas) => {
          this.cobrosAtrasadosDelivery = cuentas;
        },
        error: (error) => {
          this.cobrosAtrasadosDelivery = [];
          this.mensajeError = this.extraerError(
            error,
            'No se pudo cargar cobros atrasados.',
          );
        },
      });
  }

  cambiarVistaDelivery(vista: 'hoy' | 'cobros'): void {
    this.vistaDeliveryActiva = vista;
    this.pedidoSeleccionado = null;
    this.pedidoDetalleModal = null;
    this.pedidoPagoPendiente = null;
    this.cuentaClienteSeleccionada = null;
    this.cuentaPagoPendiente = null;

    if (vista === 'hoy') {
      this.cargarPedidos('delivery');
      return;
    }

    this.cargarCobrosAtrasadosDelivery();
  }

  aplicarFiltro(): void {
    const termino = this.filtro.trim().toLowerCase();

    if (this.subpaginaActiva === 'cuentas') {
      this.cuentasFiltradas = this.cuentasPorCobrar.filter((cuenta) => {
        const cliente = cuenta.cliente;
        const nombreCliente = this.obtenerNombreCliente(cliente).toLowerCase();
        const documento =
          `${cliente?.dni ?? ''} ${cliente?.ruc ?? ''}`.toLowerCase();
        const referencia = (cliente?.referencias ?? '').toLowerCase();
        const pedidos = cuenta.pedidos ?? [];
        const coincidePedido = pedidos.some(
          (pedido) =>
            `${pedido.pedido_id}`.includes(termino) ||
            `${this.obtenerNumeroVisualPedido(pedido)}`.includes(termino),
        );
        return (
          !termino ||
          nombreCliente.includes(termino) ||
          documento.includes(termino) ||
          referencia.includes(termino) ||
          coincidePedido
        );
      });
      this.pedidosFiltrados = this.cuentasFiltradas.flatMap(
        (cuenta) => cuenta.pedidos ?? [],
      );
      return;
    }

    const clienteFiltro = this.filtroClienteRegistros.trim().toLowerCase();
    const fechaDesde = this.filtroFechaDesdeRegistros
      ? new Date(`${this.filtroFechaDesdeRegistros}T00:00:00`)
      : null;
    const fechaHasta = this.filtroFechaHastaRegistros
      ? new Date(`${this.filtroFechaHastaRegistros}T23:59:59`)
      : null;

    this.pedidosFiltrados = this.pedidos.filter((pedido) => {
      // Fuente principal del nombre mostrado en la tabla y tarjetas del pedido.
      const nombreCliente =
        `${pedido.cliente?.nombres ?? ''} ${pedido.cliente?.apellidos ?? ''}`
          .trim()
          .toLowerCase();
      // Fuente secundaria para busquedas rapidas por documento.
      const dniCliente = (pedido.cliente?.dni ?? '').toLowerCase();
      const referenciaCliente = (pedido.cliente?.referencias ?? '').toLowerCase();
      // Fecha real registrada al crear el pedido, usada para los filtros de rango.
      const fechaPedido = pedido.fecha_hora_creacion
        ? new Date(pedido.fecha_hora_creacion)
        : null;
      const numeroVisual = `${this.obtenerNumeroVisualPedido(pedido)}`;
      const coincideTexto =
        !termino ||
        `${pedido.pedido_id}`.includes(termino) ||
        numeroVisual.includes(termino) ||
        nombreCliente.includes(termino) ||
        dniCliente.includes(termino) ||
        referenciaCliente.includes(termino);
      const usarFiltrosRegistros =
        this.subpaginaActiva === 'registros' ||
        this.subpaginaActiva === 'cuentas';
      const coincideFechaDelivery =
        this.subpaginaActiva !== 'delivery' ||
        this.esPedidoDelDiaActual(pedido);
      const coincideCuentaPendiente =
        this.subpaginaActiva !== 'cuentas' ||
        this.obtenerSaldoPendiente(pedido) > 0;
      const coincideCliente =
        !usarFiltrosRegistros ||
        !clienteFiltro ||
        nombreCliente.includes(clienteFiltro) ||
        dniCliente.includes(clienteFiltro) ||
        referenciaCliente.includes(clienteFiltro);
      const coincideEstado =
        !usarFiltrosRegistros ||
        !this.filtroEstadoRegistros ||
        this.obtenerEtiquetaEstado(pedido.estado_id) ===
          this.filtroEstadoRegistros;
      const coincideEstadoPago =
        !usarFiltrosRegistros ||
        !this.filtroEstadoPagoRegistros ||
        this.obtenerEtiquetaEstadoPago(pedido) ===
          this.filtroEstadoPagoRegistros;
      const coincideFechaDesde =
        !usarFiltrosRegistros ||
        !fechaDesde ||
        !fechaPedido ||
        fechaPedido >= fechaDesde;
      const coincideFechaHasta =
        !usarFiltrosRegistros ||
        !fechaHasta ||
        !fechaPedido ||
        fechaPedido <= fechaHasta;

      return (
        coincideTexto &&
        coincideFechaDelivery &&
        coincideCuentaPendiente &&
        coincideCliente &&
        coincideEstado &&
        coincideEstadoPago &&
        coincideFechaDesde &&
        coincideFechaHasta
      );
    });
  }

  limpiarFiltrosRegistros(): void {
    this.filtro = '';
    this.filtroClienteRegistros = '';
    this.filtroFechaDesdeRegistros = '';
    this.filtroFechaHastaRegistros = '';
    this.filtroEstadoRegistros = '';
    this.filtroEstadoPagoRegistros = '';
    this.aplicarFiltro();
  }

  buscarClientes(): void {
    const termino = this.terminoCliente.trim();
    if (!termino) {
      this.clientesSugeridos = [];
      return;
    }

    this.http
      .get<
        PedidoCliente[]
      >(`/api/clientes?search=${encodeURIComponent(termino)}`, { headers: this.obtenerHeaders() })
      .subscribe({
        next: (clientes) => {
          this.clientesSugeridos = clientes.slice(0, 6);
        },
        error: () => {
          this.clientesSugeridos = [];
        },
      });
  }

  seleccionarCliente(cliente: PedidoCliente): void {
    this.clienteSeleccionado = cliente;
    this.terminoCliente =
      `${cliente.nombres} ${cliente.apellidos ?? ''}`.trim();
    this.clientesSugeridos = [];
  }

  abrirModalCliente(): void {
    this.formularioCliente = this.crearFormularioCliente();
    this.consultaDocumento = '';
    this.mostrarModalCliente = true;
  }

  cerrarModalCliente(): void {
    this.mostrarModalCliente = false;
    this.consultaCargando = false;
    this.guardandoCliente = false;
  }

  consultarDocumentoApi(): void {
    this.mensajeError = '';
    const documento = this.consultaDocumento.trim();

    if (!/^\d+$/.test(documento)) {
      this.mensajeError = 'El documento solo debe contener digitos.';
      return;
    }

    if (documento.length === 8) {
      this.consultarApi(
        `dni/${documento}`,
        this.autocompletarDesdeDni.bind(this),
      );
      return;
    }

    if (documento.length === 11) {
      this.consultarApi(
        `ruc/${documento}`,
        this.autocompletarDesdeRuc.bind(this),
      );
      return;
    }

    this.mensajeError = 'El documento debe tener 8 (DNI) u 11 (RUC) digitos.';
  }

  guardarClienteDesdeModal(): void {
    this.guardandoCliente = true;

    const payload = {
      dni: this.formularioCliente.dni || null,
      ruc: this.formularioCliente.ruc || null,
      nombres: this.formularioCliente.nombres || '',
      apellidos: this.formularioCliente.apellidos || '',
      nombre_empresa: this.formularioCliente.nombreEmpresa || '',
      celular: this.formularioCliente.celular || '',
      direccion: this.formularioCliente.direccion || '',
      direccion_fiscal: this.formularioCliente.direccionFiscal || '',
      referencias: this.formularioCliente.referencias || '',
    };

    this.http
      .post<PedidoCliente>('/api/clientes', payload, {
        headers: this.obtenerHeaders(),
      })
      .subscribe({
        next: (cliente) => {
          this.guardandoCliente = false;
          this.seleccionarCliente(cliente);
          this.cerrarModalCliente();
        },
        error: (error) => {
          this.guardandoCliente = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo guardar el cliente.',
          );
        },
      });
  }

  limpiarFormularioCliente(): void {
    this.consultaDocumento = '';
    this.formularioCliente = this.crearFormularioCliente();
  }

  actualizarBusquedaProductos(): void {
    const termino = this.productoSeleccionado.trim().toLowerCase();
    if (!termino) {
      this.productosFiltrados = [];
      return;
    }

    this.productosFiltrados = this.productosDisponibles
      .map((producto) => producto.nombre)
      .filter((nombre) => nombre.toLowerCase().includes(termino));
  }

  seleccionarProductoDesdeBuscador(): void {
    const nombre = this.productoSeleccionado.trim();
    if (!nombre) {
      return;
    }

    const producto = this.productosDisponibles.find(
      (item) => item.nombre.toLowerCase() === nombre.toLowerCase(),
    );
    if (!producto) {
      return;
    }

    const stockDisponible =
      this.stockDisponiblePorProducto.get(producto.id) ?? 0;
    if (stockDisponible <= 0) {
      this.mostrarAlertaStockSinDisponibilidad(producto.nombre);
      this.productoSeleccionado = '';
      this.productosFiltrados = [];
      return;
    }

    const indiceFilaObjetivo = this.resolverFilaObjetivoParaProducto();
    if (indiceFilaObjetivo >= 0) {
      this.detalles[indiceFilaObjetivo].descripcion = producto.nombre;
      this.detalles[indiceFilaObjetivo].productoId = producto.id;
      this.detalles[indiceFilaObjetivo].grupoVenta = producto.grupo_venta;
      this.detalles[indiceFilaObjetivo].unidad =
        producto.grupo_venta === 'HUEVOS'
          ? 'UND'
          : this.detalles[indiceFilaObjetivo].unidad;
      this.detalles[indiceFilaObjetivo].presentacionVenta = 'UNIDAD';
      this.indiceFilaPreferida = null;
    } else {
      this.agregarLineaDetalle(producto.nombre);
      const nuevaFila = this.detalles[this.detalles.length - 1];
      nuevaFila.productoId = producto.id;
      nuevaFila.grupoVenta = producto.grupo_venta;
      nuevaFila.unidad =
        producto.grupo_venta === 'HUEVOS' ? 'UND' : nuevaFila.unidad;
      nuevaFila.presentacionVenta = 'UNIDAD';
    }

    this.productoSeleccionado = '';
    this.productosFiltrados = [];
  }

  agregarLineaDetalle(descripcion = ''): void {
    this.detalles.push({
      cantidad: 1,
      unidad: 'KG',
      descripcion,
      precioUnitario: 0,
      productoId: null,
      grupoVenta: null,
      presentacionVenta: 'UNIDAD',
    });

    if (!descripcion) {
      this.indiceFilaPreferida = this.detalles.length - 1;
    }
  }

  eliminarLineaDetalle(index: number): void {
    if (this.detalles.length === 1) {
      return;
    }
    this.detalles.splice(index, 1);
  }

  private resolverFilaObjetivoParaProducto(): number {
    if (this.indiceFilaPreferida !== null && this.indiceFilaPreferida >= 0) {
      const filaPreferida = this.detalles[this.indiceFilaPreferida];
      if (filaPreferida && !filaPreferida.descripcion.trim()) {
        return this.indiceFilaPreferida;
      }
    }

    return this.detalles.findIndex((item) => !item.descripcion.trim());
  }

  validarCantidadPorStock(index: number): void {
    const fila = this.detalles[index];
    if (!fila) {
      return;
    }

    const cantidad = this.cantidadBaseDetalle(fila);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return;
    }

    const producto = this.productosDisponibles.find(
      (item) =>
        item.nombre.trim().toLowerCase() ===
        fila.descripcion.trim().toLowerCase(),
    );

    if (!producto) {
      return;
    }

    const stockDisponible =
      this.stockDisponiblePorProducto.get(producto.id) ?? 0;
    if (cantidad > stockDisponible) {
      fila.cantidad = 0;
      this.mostrarAlertaCantidadMayorStock(producto.nombre, stockDisponible);
    }
  }

  totalDetalle(item: DetalleFormulario): number {
    if (this.esDetalleHuevos(item)) {
      return Number(item.precioUnitario ?? 0);
    }
    return Number(
      ((item.cantidad || 0) * (item.precioUnitario || 0)).toFixed(2),
    );
  }

  esDetalleHuevos(item: DetalleFormulario): boolean {
    if (item.grupoVenta) {
      return item.grupoVenta === 'HUEVOS';
    }
    const producto = this.productosDisponibles.find(
      (prod) =>
        prod.nombre.trim().toLowerCase() ===
        item.descripcion.trim().toLowerCase(),
    );
    return producto?.grupo_venta === 'HUEVOS';
  }

  factorPresentacion(
    presentacion: PresentacionHuevo | null | undefined,
  ): number {
    return (
      this.presentacionesHuevo.find((item) => item.id === presentacion)
        ?.factor ?? 1
    );
  }

  etiquetaPresentacion(
    presentacion: PresentacionHuevo | null | undefined,
  ): string {
    return (
      this.presentacionesHuevo.find((item) => item.id === presentacion)
        ?.etiqueta ?? 'Unidad'
    );
  }

  cantidadBaseDetalle(item: DetalleFormulario): number {
    const cantidad = Number(item.cantidad ?? 0);
    return this.esDetalleHuevos(item)
      ? Number(
          (cantidad * this.factorPresentacion(item.presentacionVenta)).toFixed(
            2,
          ),
        )
      : cantidad;
  }

  precioUnitarioDetalle(item: DetalleFormulario): number {
    if (!this.esDetalleHuevos(item)) {
      return Number(item.precioUnitario ?? 0);
    }
    const base = this.cantidadBaseDetalle(item);
    return base > 0
      ? Number((Number(item.precioUnitario ?? 0) / base).toFixed(6))
      : 0;
  }

  descripcionDetallePedido(item: DetalleFormulario): string {
    return this.esDetalleHuevos(item)
      ? `${item.descripcion.trim()} (${this.etiquetaPresentacion(item.presentacionVenta)})`
      : item.descripcion.trim();
  }

  totalPedido(): number {
    return this.detalles.reduce(
      (acc, item) => acc + this.totalDetalle(item),
      0,
    );
  }

  guardarPedido(): void {
    if (!this.clienteSeleccionado) {
      this.mensajeError = 'Selecciona un cliente antes de registrar el pedido.';
      return;
    }

    const detallesValidos = this.detalles.filter(
      (item) =>
        item.descripcion.trim() &&
        item.cantidad > 0 &&
        item.precioUnitario >= 0,
    );

    if (!detallesValidos.length) {
      this.mensajeError = 'Agrega al menos una linea valida en el detalle.';
      return;
    }

    this.guardandoPedido = true;
    this.mensajeError = '';

    const payload = {
      cliente_id: this.clienteSeleccionado.cliente_id,
      tipo_pedido: this.tipoPedidoFormulario,
      mesa: null,
      fecha_hora_creacion: this.fechaHoraCreacion,
      detalles: detallesValidos.map((item) => ({
        cantidad: this.cantidadBaseDetalle(item),
        unidad: this.esDetalleHuevos(item) ? 'UND' : item.unidad,
        descripcion: this.descripcionDetallePedido(item),
        precio_unitario: this.precioUnitarioDetalle(item),
      })),
    };

    this.http
      .post<PedidoDelivery>('/api/pedidos-delivery', payload, {
        headers: this.obtenerHeaders(),
      })
      .subscribe({
        next: (pedidoCreado) => {
          this.enviarFilasAVentasDiarias(
            detallesValidos,
            pedidoCreado.pedido_id,
          );
          this.guardandoPedido = false;
          this.reiniciarFormularioPedido();
          this.cargarPedidos('vendedor');
        },
        error: (error) => {
          this.guardandoPedido = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo guardar el pedido.',
          );
        },
      });
  }

  seleccionarPedido(pedido: PedidoDelivery): void {
    this.pedidoSeleccionado = pedido;
    this.estadoDestino = [2, 3, 4, 5].includes(pedido.estado_id)
      ? (pedido.estado_id as 2 | 3 | 4 | 5)
      : 2;
    this.motivoCancelacion = pedido.motivo_cancelacion ?? '';
    this.montoRecibido = null;
    this.latitud = pedido.latitud ?? pedido.cliente?.latitud ?? null;
    this.longitud = pedido.longitud ?? pedido.cliente?.longitud ?? null;
    this.fotoFrontisUrl = this.normalizarUrlFotoFrontis(
      pedido.foto_frontis_url ?? pedido.cliente?.foto_frontis_url ?? '',
    );
    this.referenciasUbicacion = pedido.cliente?.referencias ?? '';
    this.fotoFrontisArchivo = null;
  }

  cerrarModalGestion(): void {
    this.pedidoSeleccionado = null;
  }

  abrirDetallePedido(pedido: PedidoDelivery): void {
    this.pedidoDetalleModal = pedido;
  }

  cerrarModalDetallePedido(): void {
    this.pedidoDetalleModal = null;
  }

  pedidosPendientesDelivery(): PedidoDelivery[] {
    return this.pedidosFiltrados.filter((pedido) => pedido.estado_id === 1);
  }

  pedidosEnRutaDelivery(): PedidoDelivery[] {
    return this.pedidosFiltrados.filter((pedido) => pedido.estado_id === 4);
  }

  pedidosEntregadosDelivery(): PedidoDelivery[] {
    return this.pedidosFiltrados.filter((pedido) => pedido.estado_id === 2);
  }

  pedidosNoEntregadosDelivery(): PedidoDelivery[] {
    return this.pedidosFiltrados.filter(
      (pedido) => pedido.estado_id === 5 || pedido.estado_id === 3,
    );
  }

  pedidosRutaDelivery(): PedidoDelivery[] {
    return this.pedidosFiltrados.filter(
      (pedido) => pedido.estado_id === 1 || pedido.estado_id === 4,
    );
  }

  abrirMapaDelivery(): void {
    const pedidosRuta = this.pedidosRutaDelivery();
    const pedidosConUbicacion = pedidosRuta
      .map((pedido) => this.crearPuntoRuta(pedido))
      .filter((punto): punto is PuntoRutaDelivery => !!punto);

    this.pedidosSinUbicacionRuta = pedidosRuta.filter(
      (pedido) => !this.crearPuntoRuta(pedido),
    );

    if (!pedidosConUbicacion.length) {
      this.mensajeError =
        'No hay pedidos pendientes o en ruta con coordenadas guardadas.';
      return;
    }

    this.mostrarMapaDelivery = true;
    this.puntosRutaDelivery = this.ordenarPuntosRuta(pedidosConUbicacion);
    this.necesitaRenderMapaDelivery = true;
  }

  cerrarMapaDelivery(): void {
    this.mostrarMapaDelivery = false;
    this.puntosRutaDelivery = [];
    this.pedidosSinUbicacionRuta = [];
    this.destruirMapaDelivery();
  }

  usarMiUbicacionRuta(): void {
    if (!navigator.geolocation) {
      this.mensajeError = 'Este dispositivo no permite capturar ubicacion.';
      return;
    }

    this.cargandoUbicacionRuta = true;
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        this.ubicacionActualDelivery = {
          latitud: Number(posicion.coords.latitude.toFixed(7)),
          longitud: Number(posicion.coords.longitude.toFixed(7)),
        };
        this.puntosRutaDelivery = this.ordenarPuntosRuta(
          this.puntosRutaDelivery.map((punto) => ({ ...punto })),
        );
        this.cargandoUbicacionRuta = false;
        this.necesitaRenderMapaDelivery = true;
      },
      () => {
        this.cargandoUbicacionRuta = false;
        this.mensajeError = 'No se pudo capturar tu ubicacion actual.';
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  abrirRutaCompletaGoogleMaps(): void {
    if (!this.puntosRutaDelivery.length) {
      return;
    }

    const destino = this.puntosRutaDelivery[this.puntosRutaDelivery.length - 1];
    const intermedios = this.puntosRutaDelivery.slice(0, -1);
    const origen = this.ubicacionActualDelivery
      ? `&origin=${this.ubicacionActualDelivery.latitud},${this.ubicacionActualDelivery.longitud}`
      : '';
    const waypoints = intermedios.length
      ? `&waypoints=${encodeURIComponent(
          intermedios
            .map((punto) => `${punto.latitud},${punto.longitud}`)
            .join('|'),
        )}`
      : '';

    window.open(
      `https://www.google.com/maps/dir/?api=1${origen}&destination=${destino.latitud},${destino.longitud}${waypoints}&travelmode=driving`,
      '_blank',
    );
  }

  private crearPuntoRuta(pedido: PedidoDelivery): PuntoRutaDelivery | null {
    const latitud = Number(pedido.latitud ?? pedido.cliente?.latitud ?? 0);
    const longitud = Number(pedido.longitud ?? pedido.cliente?.longitud ?? 0);

    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud) ||
      (latitud === 0 && longitud === 0)
    ) {
      return null;
    }

    return {
      pedido,
      latitud,
      longitud,
      orden: 0,
      distanciaKm: null,
    };
  }

  private ordenarPuntosRuta(puntos: PuntoRutaDelivery[]): PuntoRutaDelivery[] {
    const pendientes = [...puntos];
    const ordenados: PuntoRutaDelivery[] = [];
    let origen = this.ubicacionActualDelivery
      ? {
          latitud: this.ubicacionActualDelivery.latitud,
          longitud: this.ubicacionActualDelivery.longitud,
        }
      : { latitud: pendientes[0].latitud, longitud: pendientes[0].longitud };

    while (pendientes.length) {
      let mejorIndice = 0;
      let mejorDistancia = Number.POSITIVE_INFINITY;

      pendientes.forEach((punto, indice) => {
        const distancia = this.calcularDistanciaKm(
          origen.latitud,
          origen.longitud,
          punto.latitud,
          punto.longitud,
        );
        if (distancia < mejorDistancia) {
          mejorDistancia = distancia;
          mejorIndice = indice;
        }
      });

      const [siguiente] = pendientes.splice(mejorIndice, 1);
      ordenados.push({
        ...siguiente,
        orden: ordenados.length + 1,
        distanciaKm: Number.isFinite(mejorDistancia)
          ? Number(mejorDistancia.toFixed(2))
          : null,
      });
      origen = { latitud: siguiente.latitud, longitud: siguiente.longitud };
    }

    return ordenados;
  }

  private calcularDistanciaKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const radioTierraKm = 6371;
    const dLat = this.gradosARadianes(lat2 - lat1);
    const dLon = this.gradosARadianes(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.gradosARadianes(lat1)) *
        Math.cos(this.gradosARadianes(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return radioTierraKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private gradosARadianes(valor: number): number {
    return (valor * Math.PI) / 180;
  }

  private async renderizarMapaDelivery(): Promise<void> {
    const contenedor = this.mapaDeliveryContenedor?.nativeElement;
    if (!contenedor || !this.puntosRutaDelivery.length) {
      return;
    }

    const L = await this.obtenerLeaflet();
    this.destruirMapaDelivery();

    this.mapaDelivery = L.map(contenedor, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.mapaDelivery);

    this.capaMarcadoresDelivery = L.layerGroup().addTo(this.mapaDelivery);
    const coordenadas: Leaflet.LatLngExpression[] = [];

    if (this.ubicacionActualDelivery) {
      const ubicacion: Leaflet.LatLngExpression = [
        this.ubicacionActualDelivery.latitud,
        this.ubicacionActualDelivery.longitud,
      ];
      coordenadas.push(ubicacion);
      L.circleMarker(ubicacion, {
        radius: 8,
        color: '#0ea5e9',
        fillColor: '#38bdf8',
        fillOpacity: 0.9,
      })
        .bindPopup('Tu ubicacion actual')
        .addTo(this.capaMarcadoresDelivery);
    }

    this.puntosRutaDelivery.forEach((punto) => {
      const posicion: Leaflet.LatLngExpression = [punto.latitud, punto.longitud];
      coordenadas.push(posicion);
      L.marker(posicion, {
        icon: L.divIcon({
          className: 'delivery-map-marker',
          html: `<span>${punto.orden}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
      })
        .bindPopup(
          `<strong>Pedido ${this.obtenerNumeroVisualPedido(punto.pedido)}</strong><br>${this.obtenerNombreCliente(
            punto.pedido.cliente,
          )}<br>Debe S/ ${this.obtenerSaldoPendiente(punto.pedido).toFixed(2)}`,
        )
        .addTo(this.capaMarcadoresDelivery!);
    });

    if (this.puntosRutaDelivery.length > 1) {
      L.polyline(
        this.puntosRutaDelivery.map((punto) => [punto.latitud, punto.longitud]),
        { color: '#2563eb', weight: 4, opacity: 0.75 },
      ).addTo(this.capaMarcadoresDelivery);
    }

    this.mapaDelivery.fitBounds(L.latLngBounds(coordenadas), {
      padding: [28, 28],
      maxZoom: 16,
    });

    window.setTimeout(() => this.mapaDelivery?.invalidateSize(), 120);
  }

  private async obtenerLeaflet(): Promise<typeof Leaflet> {
    if (!this.leafletLib) {
      this.leafletLib = await import('leaflet');
    }

    return this.leafletLib;
  }

  private destruirMapaDelivery(): void {
    if (this.mapaDelivery) {
      this.mapaDelivery.remove();
      this.mapaDelivery = null;
      this.capaMarcadoresDelivery = null;
    }
  }

  cobrosAtrasadosFiltrados(): CuentaCliente[] {
    const termino = this.filtroCobrosAtrasados.trim().toLowerCase();
    if (!termino) {
      return this.cobrosAtrasadosDelivery;
    }

    return this.cobrosAtrasadosDelivery.filter((cuenta) => {
      const cliente = cuenta.cliente;
      const nombre = this.obtenerNombreCliente(cliente).toLowerCase();
      const documento =
        `${cliente?.dni ?? ''} ${cliente?.ruc ?? ''}`.toLowerCase();
      const referencia = (cliente?.referencias ?? '').toLowerCase();
      const pedidos = cuenta.pedidos ?? [];
      const coincidePedido = pedidos.some((pedido) =>
        `${pedido.pedido_id}`.includes(termino),
      );
      const coincideProducto = pedidos.some((pedido) =>
        (pedido.detalles ?? []).some((detalle) =>
          detalle.descripcion.toLowerCase().includes(termino),
        ),
      );
      return (
        nombre.includes(termino) ||
        documento.includes(termino) ||
        referencia.includes(termino) ||
        coincidePedido ||
        coincideProducto
      );
    });
  }

  tomarPedido(pedido: PedidoDelivery): void {
    this.guardandoGestion = true;
    this.mensajeError = '';

    this.http
      .patch<PedidoDelivery>(
        `/api/pedidos-delivery/${pedido.pedido_id}/tomar`,
        {},
        { headers: this.obtenerHeaders() },
      )
      .subscribe({
        next: () => {
          this.guardandoGestion = false;
          this.recargarVistaActual();
        },
        error: (error) => {
          this.guardandoGestion = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo tomar el pedido.',
          );
        },
      });
  }

  cambiarEstadoDelivery(pedido: PedidoDelivery, estadoId: 2 | 4 | 5): void {
    if (!this.pedidoTomadoPorMi(pedido)) {
      this.mensajeError = 'Primero debes tomar el pedido.';
      return;
    }

    const motivo = estadoId === 5 ? 'No entregado por delivery' : null;
    this.guardandoGestion = true;
    this.mensajeError = '';

    this.http
      .patch(
        `/api/pedidos-delivery/${pedido.pedido_id}/gestion`,
        {
          estado_id: estadoId,
          motivo_cancelacion: motivo,
          estado_pago: 'PENDIENTE',
          monto_recibido: null,
          pago_parcial: null,
        },
        { headers: this.obtenerHeaders() },
      )
      .subscribe({
        next: () => {
          this.guardandoGestion = false;
          this.recargarVistaActual();
        },
        error: (error) => {
          this.guardandoGestion = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo actualizar el estado del pedido.',
          );
        },
      });
  }

  marcarVueltoPagado(pedido: PedidoDelivery): void {
    const ultimoPago = this.obtenerUltimoPago(pedido);
    if (!ultimoPago || Number(ultimoPago.vuelto ?? 0) <= 0) {
      return;
    }

    this.vueltosPagados.add(ultimoPago.pedido_pago_id);
    this.guardarVueltosPagados();
  }

  pagarTodoPedido(pedido: PedidoDelivery): void {
    if (!this.mostrarAccionPagarTodo(pedido)) {
      return;
    }

    const saldo = this.obtenerSaldoPendiente(pedido);
    this.guardandoGestion = true;
    this.mensajeError = '';

    this.http
      .patch(
        `/api/pedidos-delivery/${pedido.pedido_id}/gestion`,
        {
          estado_id: pedido.estado_id,
          motivo_cancelacion:
            pedido.estado_id === 3 ? pedido.motivo_cancelacion : null,
          estado_pago: 'COMPLETO',
          // Se usa el saldo, no el total original, para no duplicar pagos a cuenta previos.
          monto_recibido: saldo,
          pago_parcial: saldo,
        },
        { headers: this.obtenerHeaders() },
      )
      .subscribe({
        next: () => {
          this.guardandoGestion = false;
          this.recargarVistaActual();
        },
        error: (error) => {
          this.guardandoGestion = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo completar el pago del pedido.',
          );
        },
      });
  }

  pagarVueltoPedido(pedido: PedidoDelivery): void {
    if (!this.mostrarAccionPagarVuelto(pedido)) {
      return;
    }

    this.marcarVueltoPagado(pedido);
    this.recargarVistaActual();
  }

  abrirRegistroPagoCuenta(pedido: PedidoDelivery): void {
    this.pedidoPagoPendiente = pedido;
    this.cuentaPagoPendiente = null;
    this.montoPagoCuenta = null;
    this.mensajeError = '';
  }

  abrirCuentaCliente(cuenta: CuentaCliente): void {
    this.cuentaClienteSeleccionada = cuenta;
    this.mensajeError = '';
  }

  cerrarCuentaCliente(): void {
    this.cuentaClienteSeleccionada = null;
  }

  abrirRegistroPagoCliente(cuenta: CuentaCliente): void {
    this.cuentaPagoPendiente = cuenta;
    this.pedidoPagoPendiente = null;
    this.montoPagoCuenta = null;
    this.mensajeError = '';
  }

  cerrarRegistroPagoCuenta(): void {
    this.pedidoPagoPendiente = null;
    this.cuentaPagoPendiente = null;
    this.montoPagoCuenta = null;
  }

  registrarPagoCuenta(): void {
    if (!this.pedidoPagoPendiente && !this.cuentaPagoPendiente) {
      return;
    }

    const monto = Number(this.montoPagoCuenta ?? 0);
    if (!Number.isFinite(monto) || monto <= 0) {
      this.mensajeError = 'Ingresa un monto mayor a 0.';
      return;
    }

    this.registrandoPago = true;
    this.mensajeError = '';

    const url = this.cuentaPagoPendiente
      ? `/api/cuentas-por-cobrar/clientes/${this.cuentaPagoPendiente.cliente.cliente_id}/pagos`
      : `/api/pedidos-delivery/${this.pedidoPagoPendiente?.pedido_id}/pagos`;

    this.http
      .post<
        PedidoDelivery | CuentaCliente
      >(url, { monto }, { headers: this.obtenerHeaders() })
      .subscribe({
        next: (respuesta) => {
          this.registrandoPago = false;
          if (this.cuentaPagoPendiente && this.cuentaClienteSeleccionada) {
            this.cuentaClienteSeleccionada = respuesta as CuentaCliente;
          }
          this.cerrarRegistroPagoCuenta();
          this.recargarVistaActual();
        },
        error: (error) => {
          this.registrandoPago = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo registrar el pago.',
          );
        },
      });
  }

  guardarEstadoYPago(): void {
    if (!this.pedidoSeleccionado) {
      return;
    }

    const monto = Number(this.montoRecibido ?? 0);
    if (!Number.isFinite(monto) || monto < 0) {
      this.mensajeError = 'Ingresa un monto recibido valido.';
      return;
    }

    const saldo = this.obtenerSaldoPendiente(this.pedidoSeleccionado);
    const estadoPagoCalculado: 'COMPLETO' | 'PENDIENTE' | 'PARCIAL' =
      monto <= 0 ? 'PENDIENTE' : monto >= saldo ? 'COMPLETO' : 'PARCIAL';
    const pagoAplicable = Math.min(saldo, monto);

    this.guardandoGestion = true;

    this.http
      .patch(
        `/api/pedidos-delivery/${this.pedidoSeleccionado.pedido_id}/gestion`,
        {
          estado_id: this.estadoDestino,
          motivo_cancelacion:
            this.estadoDestino === 3 || this.estadoDestino === 5
              ? this.motivoCancelacion
              : null,
          estado_pago: estadoPagoCalculado,
          monto_recibido: monto,
          pago_parcial: pagoAplicable,
        },
        { headers: this.obtenerHeaders() },
      )
      .subscribe({
        next: (pedidoActualizado) => {
          this.guardandoGestion = false;
          this.pedidoSeleccionado = pedidoActualizado as PedidoDelivery;
          this.recargarVistaActual();
        },
        error: (error) => {
          this.guardandoGestion = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo guardar el estado y pago.',
          );
        },
      });
  }

  guardarUbicacionEvidencia(): void {
    if (!this.pedidoSeleccionado) {
      return;
    }

    if (this.comprimiendoFotoFrontis) {
      this.mensajeError = 'Espera a que termine de optimizar la foto.';
      return;
    }

    this.guardandoUbicacion = true;
    const formData = new FormData();

    if (this.latitud !== null && this.latitud !== undefined) {
      formData.append('latitud', String(this.latitud));
    }

    if (this.longitud !== null && this.longitud !== undefined) {
      formData.append('longitud', String(this.longitud));
    }

    if (
      this.fotoFrontisUrl &&
      !this.fotoFrontisArchivo &&
      !this.esUrlFotoFrontisValida(this.fotoFrontisUrl)
    ) {
      this.guardandoUbicacion = false;
      this.mensajeError =
        'La URL de la foto no es valida. Toma una nueva foto o usa una URL completa.';
      return;
    }

    if (this.fotoFrontisUrl && !this.fotoFrontisArchivo) {
      formData.append(
        'foto_frontis_url',
        this.normalizarUrlFotoFrontis(this.fotoFrontisUrl),
      );
    }

    if (this.referenciasUbicacion) {
      formData.append('referencias', this.referenciasUbicacion);
    }

    if (this.fotoFrontisArchivo) {
      formData.append('frontis_foto', this.fotoFrontisArchivo);
    }

    this.http
      .post(
        `/api/pedidos-delivery/${this.pedidoSeleccionado.pedido_id}/ubicacion-evidencia`,
        formData,
        { headers: this.obtenerHeaders() },
      )
      .subscribe({
        next: (pedidoActualizado) => {
          const pedido = pedidoActualizado as PedidoDelivery;
          this.guardandoUbicacion = false;
          this.fotoFrontisArchivo = null;
          this.pedidoSeleccionado = pedido;
          this.fotoFrontisUrl = this.normalizarUrlFotoFrontis(
            pedido.foto_frontis_url ?? pedido.cliente?.foto_frontis_url ?? '',
          );
          this.fotoFrontisInfo = '';
          this.recargarVistaActual();
        },
        error: (error) => {
          this.guardandoUbicacion = false;
          this.mensajeError = this.extraerError(
            error,
            'No se pudo guardar la evidencia.',
          );
        },
      });
  }

  capturarUbicacionActual(): void {
    if (!navigator.geolocation) {
      this.mensajeError = 'Este dispositivo no permite capturar ubicacion.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        this.latitud = Number(posicion.coords.latitude.toFixed(7));
        this.longitud = Number(posicion.coords.longitude.toFixed(7));
      },
      () => {
        this.mensajeError =
          'No se pudo obtener la ubicacion. Revisa permisos de GPS.';
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  manejarFotoFrontis(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.fotoFrontisArchivo = null;
    this.fotoFrontisInfo = '';

    if (!archivo) {
      return;
    }

    const tipoArchivo = archivo.type || '';
    const nombreArchivo = archivo.name.toLowerCase();
    const pareceImagen =
      tipoArchivo.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(nombreArchivo) ||
      tipoArchivo === '';

    if (!pareceImagen) {
      this.mensajeError = 'Selecciona una imagen valida para el frontis.';
      input.value = '';
      return;
    }

    this.comprimiendoFotoFrontis = true;
    this.mensajeError = '';
    this.fotoFrontisInfo = 'Preparando foto...';

    this.comprimirFotoFrontis(archivo)
      .then((fotoOptimizada) => {
        this.fotoFrontisArchivo = fotoOptimizada;
        this.fotoFrontisInfo = `Subiendo foto: ${this.formatearPesoArchivo(fotoOptimizada.size)}`;
      })
      .catch(() => {
        this.fotoFrontisArchivo = null;
        this.fotoFrontisInfo = '';
        this.mensajeError =
          'No se pudo optimizar la foto. Toma otra foto o selecciona una imagen mas liviana.';
      })
      .finally(() => {
        this.comprimiendoFotoFrontis = false;
        input.value = '';
        if (this.fotoFrontisArchivo) {
          this.guardarUbicacionEvidencia();
        }
      });
  }

  abrirWhatsapp(pedido: PedidoDelivery): void {
    const numero = this.normalizarNumero(pedido.cliente?.celular ?? '');
    if (!numero) {
      this.mensajeError = 'El cliente no tiene celular valido para WhatsApp.';
      return;
    }
    this.abrirUrlWhatsapp(
      numero,
      `Hola, tu pedido #${this.obtenerNumeroVisualPedido(pedido)} esta en ruta.`,
    );
  }

  abrirWhatsappCuenta(cuenta: CuentaCliente): void {
    const numero = this.obtenerNumeroWhatsappCliente(cuenta.cliente);
    if (!numero) {
      this.mensajeError = 'Este cliente no tiene celular valido para WhatsApp.';
      return;
    }

    this.abrirUrlWhatsapp(numero, this.construirMensajeCuentaWhatsapp(cuenta));
  }

  abrirWhatsappPedidoPendiente(
    cuenta: CuentaCliente,
    pedido: PedidoDelivery,
  ): void {
    const numero = this.obtenerNumeroWhatsappCliente(cuenta.cliente);
    if (!numero) {
      this.mensajeError = 'Este cliente no tiene celular valido para WhatsApp.';
      return;
    }

    this.abrirUrlWhatsapp(
      numero,
      this.construirMensajePedidoWhatsapp(cuenta, pedido),
    );
  }

  tieneWhatsappCliente(cliente: PedidoCliente | null | undefined): boolean {
    return !!this.obtenerNumeroWhatsappCliente(cliente);
  }

  llamarCliente(pedido: PedidoDelivery): void {
    const numero = this.normalizarNumero(pedido.cliente?.celular ?? '');
    if (!numero) {
      return;
    }
    window.location.href = `tel:+51${numero}`;
  }

  abrirUbicacionPedido(pedido: PedidoDelivery): void {
    const latitud = Number(pedido.latitud ?? pedido.cliente?.latitud ?? 0);
    const longitud = Number(pedido.longitud ?? pedido.cliente?.longitud ?? 0);

    if (
      Number.isFinite(latitud) &&
      Number.isFinite(longitud) &&
      (latitud !== 0 || longitud !== 0)
    ) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}&travelmode=driving`,
        '_blank',
      );
      return;
    }

    const direccion =
      pedido.cliente?.direccion || pedido.cliente?.direccion_fiscal;
    if (direccion) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}&travelmode=driving`,
        '_blank',
      );
      return;
    }

    this.mensajeError = 'Este pedido no tiene ubicacion registrada aun.';
  }

  verFotoFrontis(pedido: PedidoDelivery): void {
    const foto =
      pedido.foto_frontis_url || pedido.cliente?.foto_frontis_url || '';
    if (!foto) {
      this.mensajeError =
        'Este pedido no tiene foto de frontis registrada aun.';
      return;
    }

    this.fotoFrontisLightboxUrl = this.normalizarUrlFotoFrontis(foto);
  }

  cerrarFotoFrontisLightbox(): void {
    this.fotoFrontisLightboxUrl = '';
  }

  abrirFotoFrontisEnPestana(): void {
    if (this.fotoFrontisLightboxUrl) {
      window.open(this.fotoFrontisLightboxUrl, '_blank');
    }
  }

  private comprimirFotoFrontis(archivo: File): Promise<File> {
    const maxDimension = 1280;
    const pesoMaximoBytes = 900 * 1024;
    const pesoLimiteSinComprimir = 1900 * 1024;

    return new Promise((resolve, reject) => {
      const urlTemporal = URL.createObjectURL(archivo);
      const imagen = new Image();

      imagen.onload = () => {
        URL.revokeObjectURL(urlTemporal);

        const escala = Math.min(
          1,
          maxDimension / Math.max(imagen.width, imagen.height),
        );
        const ancho = Math.max(1, Math.round(imagen.width * escala));
        const alto = Math.max(1, Math.round(imagen.height * escala));
        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;

        const contexto = canvas.getContext('2d');
        if (!contexto) {
          reject();
          return;
        }

        contexto.drawImage(imagen, 0, 0, ancho, alto);
        const calidades = [0.72, 0.62, 0.52, 0.42];

        const intentarCalidad = (indice: number): void => {
          const calidad = calidades[indice] ?? calidades[calidades.length - 1];
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                if (archivo.size <= pesoLimiteSinComprimir) {
                  resolve(archivo);
                  return;
                }
                reject();
                return;
              }

              if (blob.size <= pesoMaximoBytes || indice >= calidades.length - 1) {
                const nombre = `frontis-${Date.now()}.jpg`;
                resolve(new File([blob], nombre, { type: 'image/jpeg' }));
                return;
              }

              intentarCalidad(indice + 1);
            },
            'image/jpeg',
            calidad,
          );
        };

        intentarCalidad(0);
      };

      imagen.onerror = () => {
        URL.revokeObjectURL(urlTemporal);
        if (archivo.size <= pesoLimiteSinComprimir) {
          resolve(archivo);
          return;
        }
        reject();
      };

      imagen.src = urlTemporal;
    });
  }

  private formatearPesoArchivo(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private esUrlFotoFrontisValida(url: string): boolean {
    const valor = url.trim();
    return (
      /^https?:\/\//i.test(valor) ||
      valor.startsWith('/api/frontis/') ||
      valor.startsWith('api/frontis/') ||
      valor.startsWith('/assets/images/frontis/') ||
      valor.startsWith('assets/images/frontis/') ||
      valor.startsWith('/assets/images/img-frontis/') ||
      valor.startsWith('assets/images/img-frontis/')
    );
  }

  private normalizarUrlFotoFrontis(url: string): string {
    const valor = url.trim();
    if (!valor) {
      return '';
    }

    const convertirRutaInterna = (ruta: string): string | null => {
      if (ruta.startsWith('/api/frontis/')) {
        return ruta;
      }
      if (ruta.startsWith('api/frontis/')) {
        return `/${ruta}`;
      }
      if (
        ruta.startsWith('/assets/images/frontis/') ||
        ruta.startsWith('/assets/images/img-frontis/')
      ) {
        return `/api/frontis/${ruta.split('/').pop() ?? ''}`;
      }
      if (
        ruta.startsWith('assets/images/frontis/') ||
        ruta.startsWith('assets/images/img-frontis/')
      ) {
        return `/api/frontis/${ruta.split('/').pop() ?? ''}`;
      }
      return null;
    };

    const rutaConvertida = convertirRutaInterna(valor);
    if (rutaConvertida) {
      return rutaConvertida;
    }

    if (/^https?:\/\//i.test(valor)) {
      try {
        const urlAbsoluta = new URL(valor);
        const rutaAbsolutaConvertida = convertirRutaInterna(urlAbsoluta.pathname);
        return rutaAbsolutaConvertida ?? valor;
      } catch {
        return valor;
      }
    }

    return valor;
  }
  obtenerEtiquetaEstado(estadoId: number): string {
    if (estadoId === 2) {
      return 'ENTREGADO';
    }
    if (estadoId === 3) {
      return 'CANCELADO';
    }
    if (estadoId === 4) {
      return 'EN RUTA';
    }
    if (estadoId === 5) {
      return 'NO ENTREGADO';
    }
    return 'PENDIENTE';
  }

  obtenerEtiquetaEstadoPago(pedido: PedidoDelivery): string {
    if (pedido.estado_id === 3) {
      return 'CANCELADO';
    }

    return this.obtenerEstadoPagoCalculado(pedido);
  }

  obtenerClaseBadgeEstado(estadoId: number): string {
    if (estadoId === 2) {
      return 'badge--success';
    }
    if (estadoId === 3) {
      return 'badge--danger';
    }
    if (estadoId === 4) {
      return 'badge--info';
    }
    if (estadoId === 5) {
      return 'badge--danger';
    }
    return 'badge--warning';
  }

  obtenerClaseBadgePago(pedido: PedidoDelivery): string {
    const estado = this.obtenerEtiquetaEstadoPago(pedido);
    const ultimoPago = this.obtenerUltimoPago(pedido);

    if (
      ultimoPago &&
      Number(ultimoPago.vuelto ?? 0) > 0 &&
      this.estaVueltoPagado(pedido)
    ) {
      return 'badge--success';
    }

    if (estado === 'COMPLETO') {
      return 'badge--success';
    }
    if (estado === 'PARCIAL') {
      return 'badge--info';
    }
    if (estado === 'PENDIENTE') {
      return 'badge--warning';
    }
    if (estado === 'CANCELADO') {
      return 'badge--danger';
    }

    return 'badge--neutral';
  }

  obtenerResumenEstadoPago(pedido: PedidoDelivery): string {
    if (pedido.estado_id === 3) {
      return 'CANCELADO';
    }

    const estado = this.obtenerEtiquetaEstadoPago(pedido);
    const detalle = this.obtenerDetalleEstadoPago(pedido);
    const ultimoPago = this.obtenerUltimoPago(pedido);

    if (
      ultimoPago &&
      Number(ultimoPago.vuelto ?? 0) > 0 &&
      this.estaVueltoPagado(pedido)
    ) {
      return 'COMPLETO  Vuelto pagado';
    }

    const estadoVisible =
      estado === 'PARCIAL' ? 'PAGO RECIBIDO, QUEDA SALDO' : estado;
    return detalle ? `${estadoVisible}  ${detalle}` : estadoVisible;
  }

  obtenerFechaHoraCorta(fecha: string | null | undefined): string {
    if (!fecha) {
      return '';
    }

    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  obtenerNumeroVisualPedido(pedido: PedidoDelivery | null): number | string {
    if (!pedido) {
      return '';
    }

    const pedidosDelDia = this.pedidos
      .filter((item) => this.esPedidoDelMismoDia(item, pedido))
      .sort((a, b) => a.pedido_id - b.pedido_id);

    const indice = pedidosDelDia.findIndex(
      (item) => item.pedido_id === pedido.pedido_id,
    );
    return indice >= 0 ? indice + 1 : pedido.pedido_id;
  }

  obtenerEstadoPagoTabla(pedido: PedidoDelivery): string {
    return this.obtenerResumenEstadoPago(pedido);
  }

  mostrarAccionPagarVuelto(pedido: PedidoDelivery): boolean {
    const ultimoPago = this.obtenerUltimoPago(pedido);
    return (
      !!ultimoPago &&
      Number(ultimoPago.vuelto ?? 0) > 0 &&
      !this.estaVueltoPagado(pedido)
    );
  }

  mostrarAccionPagarTodo(pedido: PedidoDelivery): boolean {
    if (pedido.estado_id === 3) {
      return false;
    }

    const estadoPago = this.obtenerEtiquetaEstadoPago(pedido);
    return estadoPago === 'PARCIAL' || estadoPago === 'PENDIENTE';
  }

  mostrarAccionVerDetalle(_pedido: PedidoDelivery): boolean {
    return true;
  }

  estaVueltoPagado(pedido: PedidoDelivery): boolean {
    const ultimoPago = this.obtenerUltimoPago(pedido);
    return !!ultimoPago && this.vueltosPagados.has(ultimoPago.pedido_pago_id);
  }

  obtenerDetalleEstadoPago(pedido: PedidoDelivery): string {
    if (pedido.estado_id === 3) {
      return '';
    }

    const total = Number(pedido.total ?? 0);
    const pagado = this.obtenerMontoPagado(pedido);
    const saldo = this.obtenerSaldoPendiente(pedido);

    if (saldo > 0 && pagado > 0) {
      return `Pago S/ ${pagado.toFixed(2)} - Debe S/ ${saldo.toFixed(2)}`;
    }

    const ultimoPago = this.obtenerUltimoPago(pedido);
    if (
      ultimoPago &&
      ultimoPago.estado_pago === 'COMPLETO' &&
      Number(ultimoPago.vuelto ?? 0) > 0
    ) {
      return `Vuelto: S/ ${Number(ultimoPago.vuelto).toFixed(2)}`;
    }

    if (saldo > 0) {
      return `Debe S/ ${total.toFixed(2)}`;
    }

    return '';
  }

  obtenerTipoPedido(pedido: PedidoDelivery): string {
    return pedido.tipo_pedido === 'MESA'
      ? `Mesa${pedido.mesa ? ` ${pedido.mesa}` : ''}`
      : 'Delivery';
  }

  obtenerNombreCliente(cliente: PedidoCliente | null | undefined): string {
    if (!cliente) {
      return 'Cliente sin datos';
    }

    const nombre = `${cliente.nombres ?? ''} ${cliente.apellidos ?? ''}`.trim();
    return nombre || cliente.nombre_empresa || 'Cliente sin nombre';
  }

  obtenerInicialesCliente(cliente: PedidoCliente | null | undefined): string {
    const nombre = this.obtenerNombreCliente(cliente);
    return (
      nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join('') || 'CL'
    );
  }

  obtenerFechaLarga(fecha: string | null | undefined): string {
    if (!fecha) {
      return 'Sin fecha';
    }

    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  obtenerMontoPagado(pedido: PedidoDelivery): number {
    if (pedido.monto_pagado !== undefined && pedido.monto_pagado !== null) {
      return Math.min(
        Number(pedido.total ?? 0),
        Number(pedido.monto_pagado ?? 0),
      );
    }

    const total = Number(pedido.total ?? 0);
    const pagado = (pedido.pagos ?? [])
      .filter((pago) => pago.estado_pago !== 'PENDIENTE')
      .reduce((acc, pago) => acc + Number(pago.pago_parcial ?? 0), 0);

    return Math.min(total, Number(pagado.toFixed(2)));
  }

  obtenerSaldoPendiente(pedido: PedidoDelivery): number {
    if (
      pedido.saldo_pendiente !== undefined &&
      pedido.saldo_pendiente !== null
    ) {
      return Math.max(0, Number(pedido.saldo_pendiente ?? 0));
    }

    return Math.max(
      0,
      Number(
        (Number(pedido.total ?? 0) - this.obtenerMontoPagado(pedido)).toFixed(
          2,
        ),
      ),
    );
  }

  puedeEmitirComprobante(pedido: PedidoDelivery): boolean {
    return (
      !this.usuarioEsDelivery() &&
      pedido.estado_id !== 3 &&
      this.obtenerSaldoPendiente(pedido) <= 0 &&
      !pedido.comprobante
    );
  }

  emitirComprobantePedido(pedido: PedidoDelivery): void {
    if (!this.puedeEmitirComprobante(pedido)) {
      return;
    }

    this.router.navigate(['/privado/venta'], {
      queryParams: { pedido: pedido.pedido_id },
    });
  }

  obtenerEtiquetaComprobante(pedido: PedidoDelivery): string {
    if (!pedido.comprobante) {
      return 'Emitir comprobante';
    }

    return `${pedido.comprobante.serie}-${pedido.comprobante.numero}`;
  }

  obtenerEstadoTextoCuenta(cuenta: CuentaCliente): string {
    if (
      Number(cuenta.monto_pagado ?? 0) > 0 &&
      Number(cuenta.saldo_pendiente ?? 0) > 0
    ) {
      return 'Pago recibido, queda saldo';
    }

    return Number(cuenta.saldo_pendiente ?? 0) > 0
      ? 'Pendiente de pago'
      : 'Cancelado';
  }

  obtenerEstadoTextoPedido(pedido: PedidoDelivery): string {
    const pagado = this.obtenerMontoPagado(pedido);
    const saldo = this.obtenerSaldoPendiente(pedido);

    if (pagado > 0 && saldo > 0) {
      return 'Pago recibido, queda saldo';
    }

    return saldo > 0 ? 'Pendiente de pago' : 'Cancelado';
  }

  obtenerEstadoPagoCalculado(
    pedido: PedidoDelivery,
  ): 'COMPLETO' | 'PENDIENTE' | 'PARCIAL' {
    if (pedido.estado_pago_calculado) {
      return pedido.estado_pago_calculado;
    }

    const saldo = this.obtenerSaldoPendiente(pedido);
    const pagado = this.obtenerMontoPagado(pedido);

    if (saldo <= 0) {
      return 'COMPLETO';
    }

    return pagado > 0 ? 'PARCIAL' : 'PENDIENTE';
  }
  obtenerFechaPago(pedido: PedidoDelivery | null): string | null {
    if (!pedido || pedido.estado_id === 3) {
      return null;
    }
    return this.obtenerUltimoPago(pedido)?.fecha_hora ?? null;
  }

  calcularVuelto(): number {
    if (!this.pedidoSeleccionado) {
      return 0;
    }

    const monto = Number(this.montoRecibido ?? 0);
    return Math.max(
      0,
      Number(
        (monto - this.obtenerSaldoPendiente(this.pedidoSeleccionado)).toFixed(
          2,
        ),
      ),
    );
  }

  calcularSaldoPendiente(): number {
    if (!this.pedidoSeleccionado) {
      return 0;
    }

    const recibido = Number(this.montoRecibido ?? 0);
    return Math.max(
      0,
      Number(
        (
          this.obtenerSaldoPendiente(this.pedidoSeleccionado) - recibido
        ).toFixed(2),
      ),
    );
  }

  private cargarProductos(search = ''): void {
    let params = new HttpParams();
    if (search.trim()) {
      params = params.set('buscar', search.trim());
    }

    this.http
      .get<
        ProductoApi[]
      >('/api/otros-productos/productos', { headers: this.obtenerHeaders(), params })
      .subscribe({
        next: (productos) => {
          this.productosDisponibles = productos;
        },
        error: () => {
          this.productosDisponibles = [];
        },
      });
  }

  private cargarStockDisponible(): void {
    this.http
      .get<
        LoteApi[]
      >('/api/otros-productos/lotes', { headers: this.obtenerHeaders() })
      .subscribe({
        next: (lotes) => {
          const stockPorProducto = new Map<number, number>();
          lotes
            .filter((lote) => lote.estado === 'ABIERTO')
            .forEach((lote) => {
              const acumulado = stockPorProducto.get(lote.producto_id) ?? 0;
              stockPorProducto.set(
                lote.producto_id,
                acumulado + Number(lote.cantidad ?? 0),
              );
            });

          this.stockDisponiblePorProducto = stockPorProducto;
        },
        error: () => {
          this.stockDisponiblePorProducto = new Map<number, number>();
        },
      });
  }

  private mostrarAlertaStockSinDisponibilidad(nombreProducto: string): void {
    const swal = (
      window as unknown as {
        Swal?: {
          fire: (
            options: Record<string, unknown>,
          ) => Promise<{ isConfirmed: boolean }>;
        };
      }
    ).Swal;

    if (!swal) {
      this.mensajeError = `No hay stock disponible para ${nombreProducto}.`;
      return;
    }

    void swal.fire({
      icon: 'warning',
      title: 'Stock insuficiente',
      text: `El producto ${nombreProducto} no tiene stock disponible en lotes abiertos.`,
      confirmButtonText: 'Entendido',
    });
  }

  private mostrarAlertaCantidadMayorStock(
    nombreProducto: string,
    stockDisponible: number,
  ): void {
    const swal = (
      window as unknown as {
        Swal?: {
          fire: (
            options: Record<string, unknown>,
          ) => Promise<{ isConfirmed: boolean }>;
        };
      }
    ).Swal;

    const mensaje = `La cantidad supera el stock disponible de ${nombreProducto} (${stockDisponible.toFixed(2)}).`;

    if (!swal) {
      this.mensajeError = mensaje;
      return;
    }

    void swal.fire({
      icon: 'warning',
      title: 'Cantidad invalida',
      text: mensaje,
      confirmButtonText: 'Entendido',
    });
  }

  /**
   * Envia en paralelo las filas del pedido al modulo de ventas diarias manuales.
   */
  private enviarFilasAVentasDiarias(
    detallesValidos: DetalleFormulario[],
    pedidoId: number,
  ): void {
    const filas = detallesValidos
      .map((detalle) => {
        const producto = detalle.productoId
          ? this.productosDisponibles.find(
              (item) => item.id === detalle.productoId,
            )
          : this.productosDisponibles.find(
              (item) =>
                item.nombre.trim().toLowerCase() ===
                detalle.descripcion.trim().toLowerCase(),
            );

        if (!producto) {
          return null;
        }

        return {
          producto_id: producto.id,
          pedido_id: pedidoId,
          origen: 'PEDIDO_DELIVERY',
          cantidad: this.cantidadBaseDetalle(detalle),
          precio: this.esDetalleHuevos(detalle)
            ? Number(detalle.precioUnitario)
            : Number(detalle.precioUnitario),
          presentacion_venta: this.esDetalleHuevos(detalle)
            ? (detalle.presentacionVenta ?? 'UNIDAD')
            : null,
          cantidad_presentacion: this.esDetalleHuevos(detalle)
            ? Number(detalle.cantidad)
            : null,
          fecha_hora: this.formatearFechaHoraApi(this.fechaHoraCreacion),
        };
      })
      .filter(
        (
          fila,
        ): fila is {
          producto_id: number;
          pedido_id: number;
          origen: string;
          cantidad: number;
          precio: number;
          presentacion_venta: PresentacionHuevo | null;
          cantidad_presentacion: number | null;
          fecha_hora: string;
        } => fila !== null,
      );

    if (!filas.length) {
      return;
    }

    const headers = this.obtenerHeaders();
    const fecha = this.fechaHoraCreacion.slice(0, 10);

    this.http
      .get<EstadoVentaDiariaPedidoApi>('/api/otros-productos/ventas-diarias', {
        headers,
        params: new HttpParams().set('fecha', fecha),
      })
      .subscribe({
        next: (estado) => {
          const filasAbiertas = (estado.filas ?? []).filter(
            (fila) => !fila.cerrado_en,
          );
          const filasSinPedidoActual = filasAbiertas
            .filter(
              (fila) =>
                !(
                  Number(fila.pedido_id ?? 0) === pedidoId &&
                  (fila.origen ?? '') === 'PEDIDO_DELIVERY'
                ),
            )
            .map((fila) => ({
              producto_id: Number(fila.producto_id),
              cantidad: Number(fila.cantidad ?? 0),
              precio: Number(fila.precio ?? 0),
              fecha_hora: fila.fecha_hora,
              pedido_id: fila.pedido_id ?? null,
              origen: fila.origen ?? null,
              presentacion_venta: fila.presentacion_venta ?? null,
              cantidad_presentacion: fila.cantidad_presentacion ?? null,
            }));

          const filasCombinadas = [...filasSinPedidoActual, ...filas];

          this.http
            .put(
              '/api/otros-productos/ventas-diarias',
              { fecha, filas: filasCombinadas },
              { headers },
            )
            .subscribe({
              error: () => {
                this.mensajeError =
                  'Pedido guardado, pero no se pudo enviar automaticamente a Ventas diarias.';
              },
            });
        },
        error: () => {
          this.mensajeError =
            'Pedido guardado, pero no se pudo consultar Ventas diarias para sincronizarlo.';
        },
      });
  }

  private formatearFechaHoraApi(valor: string): string {
    if (!valor) {
      return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    const base = valor.length === 16 ? `${valor}:00` : valor;
    return base.replace('T', ' ');
  }

  private consultarApi(
    endpoint: string,
    autocompletar: (data: Record<string, unknown>) => void,
  ): void {
    const url = `https://apiperu.dev/api/${endpoint}?api_token=${this.token}`;
    this.consultaCargando = true;

    this.http
      .get<{
        data?: Record<string, unknown>;
        success?: boolean;
        message?: string;
      }>(url)
      .subscribe({
        next: (response) => {
          if (!response?.success || !response?.data) {
            this.mensajeError =
              response?.message || 'No se encontraron datos del documento.';
            return;
          }
          autocompletar(response.data);
        },
        error: () => {
          this.mensajeError =
            'No se pudo consultar el documento en API externa.';
        },
        complete: () => {
          this.consultaCargando = false;
        },
      });
  }

  private autocompletarDesdeDni(data: Record<string, unknown>): void {
    this.formularioCliente.dni = String(
      data['numero'] ?? this.consultaDocumento,
    );
    this.formularioCliente.nombres = String(data['nombres'] ?? '');
    this.formularioCliente.apellidos =
      `${String(data['apellido_paterno'] ?? '')} ${String(data['apellido_materno'] ?? '')}`.trim();
  }

  private autocompletarDesdeRuc(data: Record<string, unknown>): void {
    this.formularioCliente.ruc = String(data['ruc'] ?? this.consultaDocumento);
    this.formularioCliente.nombreEmpresa = String(
      data['nombre_o_razon_social'] ?? '',
    );
    this.formularioCliente.direccion = String(data['direccion'] ?? '');
    this.formularioCliente.nombres =
      this.formularioCliente.nombres || this.formularioCliente.nombreEmpresa;
  }

  private crearDetalleVacio(): DetalleFormulario {
    return {
      cantidad: 1,
      unidad: 'KG',
      descripcion: '',
      precioUnitario: 0,
      productoId: null,
      grupoVenta: null,
      presentacionVenta: 'UNIDAD',
    };
  }

  private crearFormularioCliente(): ClienteFormulario {
    return {
      cliente_id: null,
      dni: '',
      ruc: '',
      nombres: '',
      apellidos: '',
      nombreEmpresa: '',
      celular: '',
      direccion: '',
      direccionFiscal: '',
      referencias: '',
    };
  }

  private reiniciarFormularioPedido(): void {
    this.fechaHoraCreacion = this.fechaActualIsoLocal();
    this.tipoPedidoFormulario = 'DELIVERY';
    this.mesaFormulario = '';
    this.detalles = [this.crearDetalleVacio()];
    this.terminoCliente = '';
    this.clienteSeleccionado = null;
    this.clientesSugeridos = [];
  }

  private recargarVistaActual(): void {
    if (this.subpaginaActiva === 'cuentas') {
      this.cargarCuentasPorCobrar();
      return;
    }

    this.cargarPedidos(
      this.subpaginaActiva === 'delivery' ? 'delivery' : 'vendedor',
    );
    if (this.subpaginaActiva === 'delivery') {
      this.cargarCobrosAtrasadosDelivery();
    }
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  private fechaActualIsoLocal(): string {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - offset).toISOString().slice(0, 16);
  }

  private programarReinicioVistaDelivery(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.reinicioVistaDeliveryTimer !== null) {
      clearTimeout(this.reinicioVistaDeliveryTimer);
    }

    const ahora = new Date();
    const siguienteMedianoche = new Date(ahora);
    siguienteMedianoche.setHours(24, 0, 0, 0);
    const milisegundosRestantes = Math.max(
      1000,
      siguienteMedianoche.getTime() - ahora.getTime(),
    );

    this.reinicioVistaDeliveryTimer = window.setTimeout(() => {
      this.aplicarFiltro();
      this.programarReinicioVistaDelivery();
    }, milisegundosRestantes);
  }

  private esPedidoDelDiaActual(pedido: PedidoDelivery): boolean {
    if (!pedido.fecha_hora_creacion) {
      return false;
    }

    const fechaPedido = new Date(pedido.fecha_hora_creacion);
    const hoy = new Date();

    if (Number.isNaN(fechaPedido.getTime())) {
      return false;
    }

    return this.esMismaFechaLocal(fechaPedido, hoy);
  }

  private esPedidoDelMismoDia(
    origen: PedidoDelivery,
    comparado: PedidoDelivery,
  ): boolean {
    const fechaOrigen = new Date(origen.fecha_hora_creacion);
    const fechaComparada = new Date(comparado.fecha_hora_creacion);

    if (
      Number.isNaN(fechaOrigen.getTime()) ||
      Number.isNaN(fechaComparada.getTime())
    ) {
      return false;
    }

    return this.esMismaFechaLocal(fechaOrigen, fechaComparada);
  }

  private esMismaFechaLocal(fechaA: Date, fechaB: Date): boolean {
    return (
      fechaA.getFullYear() === fechaB.getFullYear() &&
      fechaA.getMonth() === fechaB.getMonth() &&
      fechaA.getDate() === fechaB.getDate()
    );
  }

  private extraerError(error: unknown, fallback: string): string {
    const errorApi = error as {
      error?: { message?: string; errors?: Record<string, string[]> };
    };
    const errores = errorApi?.error?.errors;
    if (errores) {
      const primerError = Object.values(errores)?.[0]?.[0];
      if (primerError) {
        return primerError;
      }
    }
    return errorApi?.error?.message ?? fallback;
  }

  private obtenerUltimoPago(pedido: PedidoDelivery): PedidoPago | null {
    if (!pedido.pagos?.length) {
      return null;
    }

    return (
      [...pedido.pagos].sort(
        (a, b) => b.pedido_pago_id - a.pedido_pago_id,
      )[0] ?? null
    );
  }

  private cargarVueltosPagados(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const guardado = window.localStorage.getItem(this.claveVueltosPagados);
    if (!guardado) {
      return;
    }

    try {
      const ids = JSON.parse(guardado) as number[];
      this.vueltosPagados = new Set(ids.filter((id) => Number.isFinite(id)));
    } catch {
      this.vueltosPagados = new Set<number>();
    }
  }

  private guardarVueltosPagados(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      this.claveVueltosPagados,
      JSON.stringify([...this.vueltosPagados]),
    );
  }

  private normalizarNumero(numero: string): string {
    const limpio = (numero || '').replace(/\D/g, '');
    if (limpio.length === 9) {
      return limpio;
    }

    if (limpio.length === 11 && limpio.startsWith('51')) {
      return limpio.slice(2);
    }

    return '';
  }

  private obtenerNumeroWhatsappCliente(
    cliente: PedidoCliente | null | undefined,
  ): string {
    return this.normalizarNumero(cliente?.celular ?? '');
  }

  private abrirUrlWhatsapp(numero: string, mensaje: string): void {
    window.open(
      `https://wa.me/51${numero}?text=${encodeURIComponent(mensaje)}`,
      '_blank',
    );
  }

  private construirMensajeCuentaWhatsapp(cuenta: CuentaCliente): string {
    const cliente = this.obtenerNombreCliente(cuenta.cliente);
    const estado = this.obtenerEstadoTextoCuenta(cuenta);
    const pedidos = (cuenta.pedidos ?? [])
      .map((pedido) => this.construirBloquePedidoWhatsapp(pedido))
      .join('\n\n');

    return [
      `Hola, buen dia ${cliente}.`,
      '',
      'Le escribimos de POLLO FRESCO para recordarle con mucho respeto que tiene una cuenta pendiente.',
      '',
      `Estado: ${estado}`,
      `Total deuda: ${this.formatearSoles(cuenta.total_deuda)}`,
      `Pagado: ${this.formatearSoles(cuenta.monto_pagado)}`,
      `*Saldo pendiente:* ${this.formatearSoles(cuenta.saldo_pendiente)}`,
      '',
      'Detalle:',
      pedidos,
      '',
      'Si ya realizo el pago, por favor ignore este mensaje o envienos la constancia.',
      'Muchas gracias por su preferencia.',
    ].join('\n');
  }

  private construirMensajePedidoWhatsapp(
    cuenta: CuentaCliente,
    pedido: PedidoDelivery,
  ): string {
    const cliente = this.obtenerNombreCliente(cuenta.cliente);
    const estado = this.obtenerEstadoTextoPedido(pedido);

    return [
      `Hola, buen dia ${cliente}.`,
      '',
      'Le escribimos de POLLO FRESCO para recordarle el siguiente pedido pendiente:',
      '',
      `Estado: ${estado}`,
      this.construirBloquePedidoWhatsapp(pedido),
      '',
      `Pagado: ${this.formatearSoles(this.obtenerMontoPagado(pedido))}`,
      `*Saldo pendiente:* ${this.formatearSoles(this.obtenerSaldoPendiente(pedido))}`,
      '',
      'Si ya realizo el pago, por favor ignore este mensaje o envienos la constancia.',
      'Muchas gracias por su preferencia.',
    ].join('\n');
  }

  private construirBloquePedidoWhatsapp(pedido: PedidoDelivery): string {
    const detalles = (pedido.detalles ?? [])
      .map(
        (detalle) =>
          `- ${detalle.cantidad} ${detalle.unidad} ${detalle.descripcion}: ${this.formatearSoles(detalle.subtotal)}`,
      )
      .join('\n');

    return [
      `Pedido #${pedido.pedido_id} - ${this.obtenerFechaHoraCorta(pedido.fecha_hora_creacion)}`,
      detalles,
      `Total: ${this.formatearSoles(pedido.total)}`,
      `Debe: ${this.formatearSoles(this.obtenerSaldoPendiente(pedido))}`,
    ]
      .filter((linea) => linea !== '')
      .join('\n');
  }

  private formatearSoles(valor: number | string | null | undefined): string {
    return `S/ ${Number(valor ?? 0).toFixed(2)}`;
  }

  usuarioEsDelivery(): boolean {
    return this.sesionServicio.usuarioEsRol('delivery');
  }

  usuarioEsVendedor(): boolean {
    return this.sesionServicio.usuarioEsRol('vendedor');
  }

  pedidoTomadoPorMi(pedido: PedidoDelivery): boolean {
    const usuarioId = this.sesionServicio.obtenerUsuario()?.id;
    return (
      !!usuarioId &&
      Number(pedido.delivery_usuario_id ?? 0) === Number(usuarioId)
    );
  }

  pedidoDisponibleParaTomar(pedido: PedidoDelivery): boolean {
    return (
      this.usuarioEsDelivery() &&
      !pedido.delivery_usuario_id &&
      pedido.estado_id === 1
    );
  }
}
