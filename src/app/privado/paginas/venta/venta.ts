import { CommonModule, Location } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SesionServicio } from '../../../servicios/sesion.servicio';
import { SelectBonitoDirective } from '../../../compartido/directivas/select-bonito.directive';

type TipoComprobante = 'factura' | 'boleta' | 'nota-venta';
type TipoDocumentoCliente = 'ruc' | 'dni';

interface ClienteFactura {
  documento: string;
  nombre: string;
  direccion: string;
}

interface DetalleFactura {
  descripcion: string;
  unidad: string;
  cantidad: number | null;
  precioUnitario: number | null;
  productoId?: number | null;
  grupoVenta?: 'HUEVOS' | 'CONGELADO' | 'OTROS' | null;
  presentacionVenta?: PresentacionHuevo;
}

interface ProductoApi {
  id: number;
  nombre: string;
  grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

type PresentacionHuevo = 'UNIDAD' | 'MEDIO_CASILLERO' | 'CASILLERO' | 'MEDIA_JAVA' | 'JAVA';

interface LoteVentaDiariaApi {
  producto_id: number;
  cantidad: number;
  estado: 'ABIERTO' | 'CERRADO';
}

interface EstadoVentaDiariaApi {
  filas: Array<{
    producto_id: number;
    cantidad: number;
    precio: number;
    fecha_hora: string;
    cerrado_en: string | null;
    pedido_id?: number | null;
    origen?: string | null;
  }>;
}

interface FilaVentaDiariaPayload {
  producto_id: number;
  cantidad: number;
  precio: number;
  fecha_hora: string;
  pedido_id?: number | null;
  origen?: string | null;
  presentacion_venta?: PresentacionHuevo | null;
  cantidad_presentacion?: number | null;
}

interface MetodoPago {
  id: string;
  etiqueta: string;
}

interface VentaGuardada {
  comprobante_venta_id: number;
  serie: string;
  numero: string;
  estado_sunat?: string;
}

interface DetalleVentaValido {
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  producto_id?: number | null;
  grupo_venta?: 'HUEVOS' | 'CONGELADO' | 'OTROS' | null;
  presentacion_venta?: PresentacionHuevo | null;
  cantidad_presentacion?: number | null;
}

interface PreparacionPedido {
  pedido_id: number;
  tipo_pedido: 'MESA' | 'DELIVERY';
  mesa: string | null;
  total: number;
  saldo_pendiente: number;
  pagado_completo: boolean;
  comprobante: VentaGuardada | null;
  cliente: {
    dni: string | null;
    ruc: string | null;
    nombres: string | null;
    apellidos: string | null;
    nombre_empresa: string | null;
    direccion: string | null;
    direccion_fiscal: string | null;
  } | null;
  detalles: Array<{
    descripcion: string;
    unidad: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

@Component({
  selector: 'app-privado-venta',
  // Componente informativo para la seccion de venta.
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SelectBonitoDirective],
  templateUrl: './venta.html',
  styleUrl: './venta.css'
})
export class PrivadoVenta implements OnInit {
  private readonly claveBorradorVenta = 'pollo-fresco:venta:borrador:v1';

  tipoComprobante: TipoComprobante = 'factura';
  tipoDocumentoCliente: TipoDocumentoCliente = 'ruc';

  serie = 'F001';
  numero = '00012345';
  fechaEmision = new Date().toISOString().split('T')[0];
  moneda = 'PEN';
  formaPago = 'Contado';

  consultaDocumento = '';
  consultaCargando = false;
  mensajeError = '';

  cliente: ClienteFactura = {
    documento: '',
    nombre: '',
    direccion: ''
  };

  detalles: DetalleFactura[] = [];

  productosDisponibles: string[] = [];
  productosApi: ProductoApi[] = [];

  productoSeleccionado = '';
  productosFiltrados: string[] = [];
  mostrarModalProducto = false;
  nuevoProducto = '';
  metodoPagoSeleccionado = 'efectivo';
  montoRecibido: number | null = null;
  metodosPago: MetodoPago[] = [
    { id: 'efectivo', etiqueta: 'Efectivo' },
    { id: 'tarjeta', etiqueta: 'Tarjeta' },
    { id: 'transferencia', etiqueta: 'Transferencia' },
    { id: 'plin', etiqueta: 'Plin' },
    { id: 'yape', etiqueta: 'Yape' },
    { id: 'otro', etiqueta: 'Otro' }
  ];
  guardandoVenta = false;
  mensajeVenta = '';
  errorVenta = '';
  advertenciaVenta = '';
  ultimaVentaEmitida: VentaGuardada | null = null;
  formatoVoucher: 'a4' | 'ticket-80' | 'ticket-57' = 'a4';
  mostrarModalVoucher = false;
  pedidoOrigenId: number | null = null;
  cargandoPedidoOrigen = false;
  presentacionesHuevo = [
    { id: 'UNIDAD' as PresentacionHuevo, etiqueta: 'Unidad', factor: 1 },
    { id: 'MEDIO_CASILLERO' as PresentacionHuevo, etiqueta: 'Medio casillero', factor: 15 },
    { id: 'CASILLERO' as PresentacionHuevo, etiqueta: 'Casillero', factor: 30 },
    { id: 'MEDIA_JAVA' as PresentacionHuevo, etiqueta: 'Media java', factor: 180 },
    { id: 'JAVA' as PresentacionHuevo, etiqueta: 'Java', factor: 360 },
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio,
    private readonly route: ActivatedRoute,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.limpiarBorradorVenta();
    this.cargarProductos();
    const pedidoId = Number(this.route.snapshot.queryParamMap.get('pedido') ?? 0);
    if (pedidoId > 0) {
      this.cargarPedidoParaFacturar(pedidoId);
    }
    if (pedidoId > 0) {
      this.location.replaceState('/privado/venta');
    }
    this.moneda = 'PEN';
    this.formaPago = 'Contado';
    this.actualizarSerieNumero();
  }

  actualizarSerieNumero(): void {
    this.ajustarClienteAlComprobante();
    const params = new HttpParams().set('tipo', this.tipoComprobante);
    this.http.get<{ serie: string; numero: string }>('/api/ventas/siguiente-correlativo', {
      headers: this.obtenerHeaders(),
      params
    }).subscribe({
      next: (datos) => {
        this.serie = datos.serie;
        this.numero = datos.numero;
      },
      error: () => {
        this.serie = '';
        this.numero = '';
      }
    });
  }

  get subtotal(): number {
    return this.detalles.reduce((acc, item) => {
      return acc + this.totalDetalle(item);
    }, 0);
  }

  get total(): number {
    return this.subtotal;
  }

  get vuelto(): number {
    if (this.montoRecibido === null || Number.isNaN(this.montoRecibido)) {
      return 0;
    }
    return Math.max(this.montoRecibido - this.total, 0);
  }

  totalDetalle(item: DetalleFactura): number {
    if (this.esDetalleHuevos(item)) {
      return Number(item.precioUnitario ?? 0);
    }
    const cantidad = item.cantidad ?? 0;
    const precio = item.precioUnitario ?? 0;
    return cantidad * precio;
  }

  esDetalleHuevos(item: DetalleFactura): boolean {
    if (item.grupoVenta) {
      return item.grupoVenta === 'HUEVOS';
    }
    const producto = this.productosApi.find((prod) => prod.nombre.trim().toLowerCase() === item.descripcion.trim().toLowerCase());
    return producto?.grupo_venta === 'HUEVOS';
  }

  factorPresentacion(presentacion: PresentacionHuevo | null | undefined): number {
    return this.presentacionesHuevo.find((item) => item.id === presentacion)?.factor ?? 1;
  }

  etiquetaPresentacion(presentacion: PresentacionHuevo | null | undefined): string {
    return this.presentacionesHuevo.find((item) => item.id === presentacion)?.etiqueta ?? 'Unidad';
  }

  cantidadBaseDetalle(item: DetalleFactura): number {
    const cantidad = Number(item.cantidad ?? 0);
    return this.esDetalleHuevos(item) ? Number((cantidad * this.factorPresentacion(item.presentacionVenta)).toFixed(2)) : cantidad;
  }

  precioUnitarioDetalle(item: DetalleFactura): number {
    if (!this.esDetalleHuevos(item)) {
      return Number(item.precioUnitario ?? 0);
    }
    const base = this.cantidadBaseDetalle(item);
    return base > 0 ? Number((Number(item.precioUnitario ?? 0) / base).toFixed(6)) : 0;
  }

  descripcionDetalleVenta(item: DetalleFactura): string {
    const descripcion = item.descripcion.trim();
    return this.esDetalleHuevos(item) ? `${descripcion} (${this.etiquetaPresentacion(item.presentacionVenta)})` : descripcion;
  }

  agregarDetalle(descripcion: string = ''): void {
    const descripcionLimpia = descripcion.trim();
    this.detalles = [
      ...this.detalles,
      {
        descripcion: descripcionLimpia,
        unidad: 'KG',
        cantidad: null,
        precioUnitario: null,
        productoId: null,
        grupoVenta: null,
        presentacionVenta: 'UNIDAD'
      }
    ];
  }

  agregarDetalleVacio(): void {
    this.agregarDetalle('');
  }

  seleccionarProductoDesdeBuscador(): void {
    const seleccionado = this.productoSeleccionado.trim().toLowerCase();
    if (!seleccionado) {
      return;
    }
    const existe = this.productosDisponibles.some(
      (producto) => producto.toLowerCase() === seleccionado
    );
    if (existe) {
      const producto = this.productosApi.find((item) => item.nombre.toLowerCase() === seleccionado);
      this.agregarDetalle(this.productoSeleccionado);
      const ultimo = this.detalles[this.detalles.length - 1];
      if (producto && ultimo) {
        ultimo.productoId = producto.id;
        ultimo.grupoVenta = producto.grupo_venta;
        ultimo.unidad = producto.grupo_venta === 'HUEVOS' ? 'UND' : 'KG';
        ultimo.presentacionVenta = 'UNIDAD';
      }
      this.productoSeleccionado = '';
    }
  }

  filtrarProductos(): void {
    const termino = this.productoSeleccionado.trim().toLowerCase();
    if (!termino) {
      this.productosFiltrados = [];
      return;
    }
    this.productosFiltrados = this.productosDisponibles.filter((producto) =>
      producto.toLowerCase().includes(termino)
    );
  }

  actualizarBusquedaProductos(): void {
    this.cargarProductos(this.productoSeleccionado);
  }

  abrirModalProducto(): void {
    this.mostrarModalProducto = true;
  }

  cerrarModalProducto(): void {
    this.mostrarModalProducto = false;
    this.nuevoProducto = '';
  }

  guardarProductoNuevo(): void {
    const nombre = this.nuevoProducto.trim();
    if (!nombre) {
      return;
    }

    const headers = this.obtenerHeaders();
    this.http
      .post<ProductoApi>('/api/otros-productos/productos', { nombre, grupo_venta: 'OTROS' }, { headers })
      .subscribe({
        next: (producto) => {
          const nombreProducto = producto?.nombre ?? nombre;
          this.productosDisponibles = [...this.productosDisponibles, nombreProducto];
          this.filtrarProductos();
          this.nuevoProducto = '';
          this.mostrarModalProducto = false;
        },
        error: () => {
          this.mostrarModalProducto = false;
        }
      });
  }

  private cargarProductos(termino: string = ''): void {
    const limpio = termino.trim();
    const params = limpio ? new HttpParams().set('buscar', limpio) : undefined;
    const headers = this.obtenerHeaders();

    this.http.get<ProductoApi[]>('/api/otros-productos/productos', { params, headers }).subscribe({
      next: (productos) => {
        this.productosApi = productos;
        this.productosDisponibles = productos.map((producto) => producto.nombre);
        this.filtrarProductos();
      },
      error: () => {
        this.filtrarProductos();
      }
    });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  eliminarDetalle(index: number): void {
    this.detalles = this.detalles.filter((_, i) => i !== index);
  }

  seleccionarMetodoPago(metodoId: string): void {
    this.metodoPagoSeleccionado = metodoId;
    if (metodoId !== 'efectivo') {
      this.montoRecibido = null;
    }
  }

  emitirComprobante(): void {
    this.errorVenta = '';
    this.mensajeVenta = '';
    if (!this.detalles.length) {
      this.errorVenta = 'Agrega al menos un producto para registrar la venta.';
      return;
    }
    if (this.tipoComprobante === 'factura' && !/^\d{11}$/.test(this.cliente.documento)) {
      this.errorVenta = 'Para emitir una factura, consulta o ingresa un RUC valido de 11 digitos.';
      return;
    }
    if (this.tipoComprobante === 'factura' && !this.cliente.nombre.trim()) {
      this.errorVenta = 'La factura requiere la razon social del cliente.';
      return;
    }
    if (this.tipoComprobante === 'boleta' && this.cliente.documento && !/^\d{8}$/.test(this.cliente.documento)) {
      this.errorVenta = 'El DNI de la boleta debe tener 8 digitos.';
      return;
    }
    if (this.metodoPagoSeleccionado === 'efectivo' && this.montoRecibido !== null && this.montoRecibido < this.total) {
      this.errorVenta = 'El monto recibido es menor que el total. Corrige el pago antes de emitir.';
      return;
    }

    const detallesValidos: DetalleVentaValido[] = this.detalles
      .filter((item) => !!item.descripcion.trim() && (item.cantidad ?? 0) > 0)
      .map((item) => ({
        descripcion: this.descripcionDetalleVenta(item),
        unidad: this.esDetalleHuevos(item) ? 'UND' : item.unidad,
        cantidad: this.cantidadBaseDetalle(item),
        precio_unitario: this.precioUnitarioDetalle(item),
        producto_id: item.productoId ?? this.productosApi.find((prod) => prod.nombre.trim().toLowerCase() === item.descripcion.trim().toLowerCase())?.id ?? null,
        grupo_venta: item.grupoVenta ?? this.productosApi.find((prod) => prod.nombre.trim().toLowerCase() === item.descripcion.trim().toLowerCase())?.grupo_venta ?? null,
        presentacion_venta: this.esDetalleHuevos(item) ? item.presentacionVenta ?? 'UNIDAD' : null,
        cantidad_presentacion: this.esDetalleHuevos(item) ? Number(item.cantidad ?? 0) : null
      }));

    if (!detallesValidos.length) {
      this.errorVenta = 'Verifica el detalle de la venta. Debe tener descripcion y cantidad.';
      return;
    }

    const payload = {
      tipo_comprobante: this.tipoComprobante,
      fecha_emision: this.fechaEmision,
      moneda: this.moneda,
      forma_pago: this.formaPago,
      metodo_pago: this.metodoPagoSeleccionado,
      pedido_id: this.pedidoOrigenId,
      cliente_tipo_documento: this.tipoDocumentoCliente,
      cliente_documento: this.cliente.documento,
      cliente_nombre: this.cliente.nombre,
      cliente_direccion: this.cliente.direccion,
      subtotal: this.subtotal,
      total: this.total,
      monto_recibido: this.montoRecibido,
      vuelto: this.vuelto,
      detalles: detallesValidos
    };

    this.guardandoVenta = true;
    this.http.post<VentaGuardada>('/api/ventas', payload, { headers: this.obtenerHeaders() }).subscribe({
      next: (venta) => {
        this.guardandoVenta = false;
        this.mensajeVenta = venta.serie.startsWith('NV')
          ? 'Nota de venta interna registrada correctamente.'
          : 'Comprobante registrado y pendiente de envío a SUNAT.';
        this.advertenciaVenta = '';
        this.ultimaVentaEmitida = venta;
        this.mostrarModalVoucher = true;
        if (this.pedidoOrigenId === null) {
          this.sincronizarConVentasDiarias(detallesValidos);
        }
        this.limpiarFormularioVenta();
      },
      error: (err) => {
        this.guardandoVenta = false;
        this.errorVenta = err?.error?.message ?? 'No se pudo guardar la venta. Intentalo nuevamente.';
      }
    });
  }

  imprimirVoucher(): void {
    this.abrirComprobante('print');
  }

  descargarVoucher(): void {
    this.abrirComprobante('download');
  }

  descargarXmlVoucher(): void {
    this.abrirXmlComprobante();
  }

  enviarSunat(): void {
    if (!this.ultimaVentaEmitida) {
      return;
    }
    this.guardandoVenta = true;
    this.http.post<{ estado_sunat: string; descripcion: string }>(
      `/api/ventas/${this.ultimaVentaEmitida.comprobante_venta_id}/enviar-sunat`,
      {},
      { headers: this.obtenerHeaders() }
    ).subscribe({
      next: (respuesta) => {
        this.guardandoVenta = false;
        this.ultimaVentaEmitida = { ...this.ultimaVentaEmitida!, estado_sunat: respuesta.estado_sunat };
        this.mensajeVenta = `SUNAT: ${respuesta.estado_sunat}. ${respuesta.descripcion ?? ''}`.trim();
      },
      error: (error) => {
        this.guardandoVenta = false;
        this.errorVenta = error?.error?.message ?? 'No se pudo enviar el comprobante a SUNAT.';
      }
    });
  }

  cambiarTipoDocumento(): void {
    this.limpiarCliente();
  }

  limpiarCliente(): void {
    this.consultaDocumento = '';
    this.cliente = { documento: '', nombre: '', direccion: '' };
    this.mensajeError = '';
  }

  private ajustarClienteAlComprobante(): void {
    if (this.tipoComprobante === 'factura' && this.tipoDocumentoCliente !== 'ruc') {
      this.tipoDocumentoCliente = 'ruc';
      this.limpiarCliente();
      return;
    }
    if (this.tipoComprobante === 'boleta' && this.tipoDocumentoCliente !== 'dni') {
      this.tipoDocumentoCliente = 'dni';
      this.limpiarCliente();
    }
  }

  enviarVoucher(): void {
    if (!this.ultimaVentaEmitida) {
      return;
    }

    this.obtenerPdfBlob(this.ultimaVentaEmitida.comprobante_venta_id).subscribe({
      next: async (blob) => {
        const archivo = new File([blob], `comprobante-${this.ultimaVentaEmitida?.serie}-${this.ultimaVentaEmitida?.numero}.pdf`, {
          type: 'application/pdf'
        });

        if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
          await navigator.share({
            title: 'Comprobante de venta',
            text: 'Adjunto el comprobante de venta en PDF.',
            files: [archivo]
          });
          return;
        }

        this.errorVenta = 'Tu navegador no soporta el envio directo. Usa Descargar PDF.';
      },
      error: () => {
        this.errorVenta = 'No se pudo generar el voucher para enviar.';
      }
    });
  }

  cerrarModalVoucher(): void {
    this.mostrarModalVoucher = false;
  }

  private limpiarFormularioVenta(): void {
    this.tipoComprobante = 'factura';
    this.actualizarSerieNumero();
    this.fechaEmision = new Date().toISOString().split('T')[0];
    this.moneda = 'PEN';
    this.formaPago = 'Contado';
    this.tipoDocumentoCliente = 'ruc';
    this.consultaDocumento = '';
    this.cliente = {
      documento: '',
      nombre: '',
      direccion: ''
    };
    this.detalles = [];
    this.productoSeleccionado = '';
    this.metodoPagoSeleccionado = 'efectivo';
    this.montoRecibido = null;
    this.advertenciaVenta = '';
    this.pedidoOrigenId = null;
    this.limpiarBorradorVenta();
  }

  private cargarPedidoParaFacturar(pedidoId: number): void {
    this.cargandoPedidoOrigen = true;
    this.errorVenta = '';

    this.http.get<PreparacionPedido>(`/api/ventas/preparar-desde-pedido/${pedidoId}`, {
      headers: this.obtenerHeaders()
    }).subscribe({
      next: (preparacion) => {
        this.cargandoPedidoOrigen = false;
        if (preparacion.comprobante) {
          this.errorVenta = `El pedido ya tiene el comprobante ${preparacion.comprobante.serie}-${preparacion.comprobante.numero}.`;
          return;
        }
        if (!preparacion.pagado_completo) {
          this.errorVenta = `El pedido aun tiene un saldo pendiente de S/ ${Number(preparacion.saldo_pendiente).toFixed(2)}.`;
          return;
        }

        const cliente = preparacion.cliente;
        const documento = cliente?.ruc || cliente?.dni || '';
        this.pedidoOrigenId = preparacion.pedido_id;
        this.tipoDocumentoCliente = cliente?.ruc ? 'ruc' : 'dni';
        this.tipoComprobante = cliente?.ruc ? 'factura' : 'boleta';
        this.consultaDocumento = documento;
        this.cliente = {
          documento,
          nombre: cliente?.nombre_empresa
            || `${cliente?.nombres ?? ''} ${cliente?.apellidos ?? ''}`.trim(),
          direccion: cliente?.direccion_fiscal || cliente?.direccion || ''
        };
        this.detalles = preparacion.detalles.map((detalle) => ({
          descripcion: detalle.descripcion,
          unidad: detalle.unidad,
          cantidad: Number(detalle.cantidad),
          precioUnitario: Number(detalle.precio_unitario)
        }));
        this.metodoPagoSeleccionado = 'efectivo';
        this.montoRecibido = Number(preparacion.total);
        this.actualizarSerieNumero();
        this.limpiarBorradorVenta();
      },
      error: (error) => {
        this.cargandoPedidoOrigen = false;
        this.errorVenta = error?.error?.message ?? 'No se pudo cargar el pedido para emitir su comprobante.';
      }
    });
  }

  private sincronizarConVentasDiarias(detalles: DetalleVentaValido[]): void {
    const headers = this.obtenerHeaders();
    const fecha = this.fechaEmision || new Date().toISOString().slice(0, 10);

    this.http.get<ProductoApi[]>('/api/otros-productos/productos', { headers }).subscribe({
      next: (productos) => {
        const productosPorNombre = new Map(productos.map((producto) => [producto.nombre.trim().toLowerCase(), producto]));
        const nuevasFilas = detalles.reduce((acc, item) => {
          const producto = item.producto_id
            ? productos.find((prod) => prod.id === item.producto_id)
            : productosPorNombre.get(item.descripcion.trim().toLowerCase());
          if (!producto) {
            return acc;
          }

          acc.push({
            producto_id: producto.id,
            cantidad: item.cantidad,
            precio: item.grupo_venta === 'HUEVOS'
              ? Number((item.cantidad * item.precio_unitario).toFixed(2))
              : item.precio_unitario,
            fecha_hora: this.generarFechaHoraVentaDiaria(fecha),
            presentacion_venta: item.presentacion_venta ?? null,
            cantidad_presentacion: item.cantidad_presentacion ?? null
          });
          return acc;
        }, [] as FilaVentaDiariaPayload[]);

        if (!nuevasFilas.length) {
          this.advertenciaVenta = 'Comprobante emitido. No se sincronizo ventas diarias porque ningun detalle coincide con un producto registrado.';
          return;
        }

        this.http.get<LoteVentaDiariaApi[]>('/api/otros-productos/lotes', { headers }).subscribe({
          next: (lotes) => {
            const stockPorProducto = lotes
              .filter((lote) => lote.estado === 'ABIERTO')
              .reduce((mapa, lote) => {
                const actual = mapa.get(lote.producto_id) ?? 0;
                mapa.set(lote.producto_id, actual + Number(lote.cantidad ?? 0));
                return mapa;
              }, new Map<number, number>());

            this.http
              .get<EstadoVentaDiariaApi>('/api/otros-productos/ventas-diarias', {
                headers,
                params: new HttpParams().set('fecha', fecha)
              })
              .subscribe({
                next: (estado) => {
                  const filasAbiertas = (estado.filas ?? []).filter((fila) => !fila.cerrado_en);
                  const consumoActual = filasAbiertas.reduce((mapa, fila) => {
                    const actual = mapa.get(fila.producto_id) ?? 0;
                    mapa.set(fila.producto_id, actual + Number(fila.cantidad ?? 0));
                    return mapa;
                  }, new Map<number, number>());

                  const consumoNuevo = nuevasFilas.reduce((mapa, fila) => {
                    const actual = mapa.get(fila.producto_id) ?? 0;
                    mapa.set(fila.producto_id, actual + Number(fila.cantidad ?? 0));
                    return mapa;
                  }, new Map<number, number>());

                  const productosSinStock = Array.from(consumoNuevo.entries()).filter(([productoId, cantidad]) => {
                    const stock = stockPorProducto.get(productoId) ?? 0;
                    const consumo = (consumoActual.get(productoId) ?? 0) + cantidad;
                    return stock <= 0 || consumo > stock;
                  });

                  if (productosSinStock.length > 0) {
                    this.advertenciaVenta = 'Comprobante emitido. No se sincronizo ventas diarias porque algunos productos no tienen stock disponible.';
                    return;
                  }

                  const filasCombinadas: FilaVentaDiariaPayload[] = [
                    ...filasAbiertas.map((fila) => ({
                      producto_id: fila.producto_id,
                      cantidad: Number(fila.cantidad ?? 0),
                      precio: Number(fila.precio ?? 0),
                      fecha_hora: fila.fecha_hora,
                      pedido_id: fila.pedido_id ?? null,
                      origen: fila.origen ?? null
                    })),
                    ...nuevasFilas
                  ];

                  this.http
                    .put('/api/otros-productos/ventas-diarias', { fecha, filas: filasCombinadas }, { headers })
                    .subscribe({
                      next: () => {
                        this.advertenciaVenta = '';
                      },
                      error: (error) => {
                        this.advertenciaVenta = error?.error?.message
                          ?? 'Comprobante emitido, pero no se pudo sincronizar el registro de ventas diarias.';
                      }
                    });
                },
                error: () => {
                  this.advertenciaVenta = 'Comprobante emitido, pero no se pudo consultar el registro de ventas diarias.';
                }
              });
          },
          error: () => {
            this.advertenciaVenta = 'Comprobante emitido, pero no se pudo validar stock para ventas diarias.';
          }
        });
      },
      error: () => {
        this.advertenciaVenta = 'Comprobante emitido, pero no se pudo sincronizar ventas diarias.';
      }
    });
  }

  private generarFechaHoraVentaDiaria(fecha: string): string {
    const horaActual = new Date().toTimeString().slice(0, 8);
    return `${fecha} ${horaActual}`;
  }

  private abrirComprobante(modo: 'print' | 'download'): void {
    if (!this.ultimaVentaEmitida) {
      return;
    }

    this.obtenerPdfBlob(this.ultimaVentaEmitida.comprobante_venta_id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (modo === 'print') {
          const ventana = window.open(url, '_blank');
          if (ventana) {
            ventana.onload = () => ventana.print();
          }
          return;
        }

        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `comprobante-${this.ultimaVentaEmitida?.serie}-${this.ultimaVentaEmitida?.numero}.pdf`;
        enlace.click();
      },
      error: () => {
        this.errorVenta = 'No se pudo generar el voucher en PDF.';
      }
    });
  }

  private obtenerPdfBlob(ventaId: number) {
    return this.http.get(this.obtenerUrlPdf(ventaId), {
      headers: this.obtenerHeaders(),
      responseType: 'blob'
    });
  }

  private obtenerUrlPdf(ventaId: number): string {
    return `/api/ventas/${ventaId}/pdf?formato=${this.formatoVoucher}`;
  }


  private abrirXmlComprobante(): void {
    if (!this.ultimaVentaEmitida) {
      return;
    }

    this.obtenerXmlBlob(this.ultimaVentaEmitida.comprobante_venta_id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `comprobante-${this.ultimaVentaEmitida?.serie}-${this.ultimaVentaEmitida?.numero}.xml`;
        enlace.click();
      },
      error: () => {
        this.errorVenta = 'No se pudo generar el XML del comprobante.';
      }
    });
  }

  private obtenerXmlBlob(ventaId: number) {
    return this.http.get(this.obtenerUrlXml(ventaId), {
      headers: this.obtenerHeaders(),
      responseType: 'blob'
    });
  }

  private obtenerUrlXml(ventaId: number): string {
    return `/api/ventas/${ventaId}/xml`;
  }

  private limpiarBorradorVenta(): void {
    localStorage.removeItem(this.claveBorradorVenta);
  }

  consultarDocumento(): void {
    this.mensajeError = '';
    this.consultaDocumento = this.consultaDocumento.replace(/\D+/g, '');

    if (!this.consultaDocumento.trim()) {
      this.mensajeError = 'Ingresa el numero de documento.';
      return;
    }

    const longitudEsperada = this.tipoDocumentoCliente === 'dni' ? 8 : 11;
    if (this.consultaDocumento.length !== longitudEsperada) {
      this.mensajeError = `El ${this.tipoDocumentoCliente.toUpperCase()} debe tener ${longitudEsperada} digitos.`;
      return;
    }

    const endpoint = this.tipoDocumentoCliente === 'dni' ? 'dni' : 'ruc';
    const url = `/api/documentos/${endpoint}/${this.consultaDocumento}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url, { headers: this.obtenerHeaders() }).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        if (this.tipoDocumentoCliente === 'dni') {
          this.autocompletarDesdeDni(datos);
        } else {
          this.autocompletarDesdeRuc(datos);
        }
        this.consultaDocumento = '';
      },
      error: () => {
        this.mensajeError = 'No pudimos consultar SUNAT/RENIEC. Revisa el número o la configuración del servidor.';
        this.consultaCargando = false;
      },
      complete: () => {
        this.consultaCargando = false;
      }
    });
  }

  private autocompletarDesdeDni(datos: Record<string, unknown>): void {
    const apellidoPaterno = (datos['apellido_paterno'] as string) ?? '';
    const apellidoMaterno = (datos['apellido_materno'] as string) ?? '';
    const nombres = (datos['nombres'] as string) ?? (datos['nombre'] as string) ?? '';

    this.cliente = {
      ...this.cliente,
      documento: ((datos['numero'] as string) ?? this.consultaDocumento).toString(),
      nombre:
        (datos['nombre_completo'] as string) ||
        `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim() ||
        this.cliente.nombre
    };
  }

  private autocompletarDesdeRuc(datos: Record<string, unknown>): void {
    this.cliente = {
      ...this.cliente,
      documento: ((datos['numero'] as string) ?? this.consultaDocumento).toString(),
      nombre:
        (datos['nombre_o_razon_social'] as string) ??
        (datos['razon_social'] as string) ??
        (datos['nombre_comercial'] as string) ??
        this.cliente.nombre,
      direccion: (datos['direccion'] as string) ?? this.cliente.direccion
    };
  }
}
