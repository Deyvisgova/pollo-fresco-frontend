import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface LoteRegistro {
  compraLoteId: number;
  numeroLote: number;
  nombre: string;
  productoId: number;
  cantidad: number;
  presentacionIngreso: PresentacionHuevo | null;
  cantidadPresentacion: number | null;
  factorConversion: number | null;
  costoKilo: number;
  costoTotalCompra: number | null;
  precioVenta: number;
  codigoComprobante: string;
  totalCosto: number;
  totalVenta: number;
  fechaIngreso: string;
  creadoEn: string;
  estado: 'ABIERTO' | 'CERRADO';
  proveedorId: number | null;
  proveedorNombre: string;
}

interface Producto {
  id: number;
  nombre: string;
  grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

interface ProductoApi {
  id: number;
  nombre: string;
  grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

interface LoteApi {
  numero_lote: number;
  compra_lote_id: number;
  fecha_ingreso: string;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  presentacion_ingreso: PresentacionHuevo | null;
  cantidad_presentacion: number | null;
  factor_conversion: number | null;
  costo_kilo: number;
  costo_total_compra: number | null;
  precio_venta: number;
  codigo_comprobante: string;
  creado_en: string;
  estado: 'ABIERTO' | 'CERRADO';
  proveedor_id: number | null;
  proveedor_nombres: string | null;
  proveedor_apellidos: string | null;
  proveedor_nombre_empresa: string | null;
  proveedor_ruc: string | null;
  proveedor_dni: string | null;
}

interface LoteForm {
  fechaIngreso: string;
  codigoComprobante: string;
  productoId: number | null;
  cantidad: number | null;
  presentacionIngreso: PresentacionHuevo;
  cantidadPresentacion: number | null;
  costoTotalHuevos: number | null;
  costoKilo: number | null;
  precioVenta: number | null;
  proveedorId: number | null;
}

type PresentacionHuevo = 'UNIDAD' | 'MEDIO_CASILLERO' | 'CASILLERO' | 'MEDIA_JAVA' | 'JAVA';

interface ProveedorApi {
  proveedor_id: number;
  nombres: string;
  apellidos: string | null;
  nombre_empresa: string | null;
  ruc: string | null;
  dni: string | null;
}

@Component({
  selector: 'app-privado-otros-productos-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './otros-productos-lotes.html',
  styleUrl: './otros-productos-lotes.css'
})
export class PrivadoOtrosProductosLotes implements OnInit {
  mostrarModal = false;
  mostrarModalProducto = false;
  filtro = '';
  nuevoProducto = '';
  nuevoProductoGrupoVenta: 'HUEVOS' | 'CONGELADO' | 'OTROS' = 'HUEVOS';
  filtroProducto = '';
  dropdownProductoAbierto = false;
  filtroProveedor = '';
  dropdownProveedorAbierto = false;
  mensajeError = '';
  productos: Producto[] = [];
  proveedores: ProveedorApi[] = [];
  loteEnEdicion: LoteRegistro | null = null;

  loteForm: LoteForm = {
    fechaIngreso: this.obtenerFechaLocalISO(),
    codigoComprobante: '',
    productoId: null,
    cantidad: null,
    presentacionIngreso: 'JAVA',
    cantidadPresentacion: null,
    costoTotalHuevos: null,
    costoKilo: null,
    precioVenta: null,
    proveedorId: null
  };

  lotes: LoteRegistro[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarProveedores();
    this.cargarLotes();
  }

  get lotesFiltrados(): LoteRegistro[] {
    const valor = this.filtro.trim().toLowerCase();
    if (!valor) {
      return this.lotes;
    }

    return this.lotes.filter((lote) => {
      return (
        lote.numeroLote.toString().includes(valor) ||
        lote.nombre.toLowerCase().includes(valor) ||
        lote.proveedorNombre.toLowerCase().includes(valor) ||
        lote.estado.toLowerCase().includes(valor) ||
        lote.fechaIngreso.toLowerCase().includes(valor)
        || lote.codigoComprobante.toLowerCase().includes(valor)
      );
    });
  }

  abrirModal(): void {
    this.mostrarModal = true;
    this.filtroProducto = '';
    this.filtroProveedor = '';
    this.dropdownProductoAbierto = false;
    this.dropdownProveedorAbierto = false;
    this.mensajeError = '';
    this.loteEnEdicion = null;
    this.loteForm = {
      fechaIngreso: this.obtenerFechaLocalISO(),
      codigoComprobante: '',
      productoId: null,
      cantidad: null,
      presentacionIngreso: 'JAVA',
      cantidadPresentacion: null,
      costoTotalHuevos: null,
      costoKilo: null,
      precioVenta: null,
      proveedorId: null
    };
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  abrirModalProducto(): void {
    this.mostrarModalProducto = true;
    this.nuevoProducto = '';
    this.nuevoProductoGrupoVenta = 'HUEVOS';
    this.mensajeError = '';
  }

  cerrarModalProducto(): void {
    this.mostrarModalProducto = false;
  }

  guardarProducto(): void {
    const nombre = this.nuevoProducto.trim();
    if (!nombre) {
      return;
    }
    this.mensajeError = '';

    const headers = this.obtenerHeaders();
    this.http
      .post<ProductoApi>(
        '/api/otros-productos/productos',
        { nombre, grupo_venta: this.nuevoProductoGrupoVenta },
        { headers }
      )
      .subscribe({
        next: (producto) => {
          this.productos = [...this.productos, producto];
          this.loteForm.productoId = producto.id;
          this.filtroProducto = producto.nombre;
          this.cerrarModalProducto();
        },
        error: () => {
          this.mensajeError = 'No pudimos guardar el producto. Intenta nuevamente.';
        }
      });
  }

  siguienteNumeroLote(productoId: number): number {
    const conteo = this.lotes.filter((lote) => lote.productoId === productoId).length;
    return conteo + 1;
  }

  get productosFiltrados(): Producto[] {
    const valor = this.filtroProducto.trim().toLowerCase();
    if (!valor) {
      return this.productos;
    }
    return this.productos.filter((producto) => producto.nombre.toLowerCase().includes(valor));
  }

  toggleDropdownProducto(): void {
    this.dropdownProductoAbierto = !this.dropdownProductoAbierto;
  }

  toggleDropdownProveedor(): void {
    this.dropdownProveedorAbierto = !this.dropdownProveedorAbierto;
  }

  seleccionarProductoId(producto: Producto): void {
    this.loteForm.productoId = producto.id;
    this.filtroProducto = producto.nombre;
    this.dropdownProductoAbierto = false;
    if (producto.grupo_venta === 'HUEVOS') {
      this.loteForm.presentacionIngreso = this.loteForm.presentacionIngreso || 'JAVA';
      this.actualizarCantidadBaseHuevos();
    }
  }

  seleccionarProveedor(proveedor: ProveedorApi): void {
    this.loteForm.proveedorId = proveedor.proveedor_id;
    this.filtroProveedor = this.formatearProveedor(proveedor);
    this.dropdownProveedorAbierto = false;
  }

  get nombreProductoSeleccionado(): string {
    if (!this.loteForm.productoId) {
      return '';
    }
    return this.productos.find((item) => item.id === this.loteForm.productoId)?.nombre ?? '';
  }

  get nombreProveedorSeleccionado(): string {
    if (!this.loteForm.proveedorId) {
      return '';
    }
    const proveedor = this.proveedores.find((item) => item.proveedor_id === this.loteForm.proveedorId);
    return proveedor ? this.formatearProveedor(proveedor) : '';
  }

  get proveedoresFiltrados(): ProveedorApi[] {
    const valor = this.filtroProveedor.trim().toLowerCase();
    if (!valor) {
      return this.proveedores;
    }
    return this.proveedores.filter((proveedor) =>
      this.formatearProveedor(proveedor).toLowerCase().includes(valor)
    );
  }


  esStockBajo(lote: LoteRegistro): boolean {
    return lote.estado === 'ABIERTO' && lote.cantidad <= 5;
  }

  get productoSeleccionado(): Producto | null {
    if (!this.loteForm.productoId) {
      return null;
    }
    return this.productos.find((item) => item.id === this.loteForm.productoId) ?? null;
  }

  get loteEsHuevos(): boolean {
    return this.productoSeleccionado?.grupo_venta === 'HUEVOS';
  }

  presentacionesHuevo = [
    { id: 'UNIDAD' as PresentacionHuevo, etiqueta: 'Unidad', factor: 1 },
    { id: 'MEDIO_CASILLERO' as PresentacionHuevo, etiqueta: 'Medio casillero', factor: 15 },
    { id: 'CASILLERO' as PresentacionHuevo, etiqueta: 'Casillero', factor: 30 },
    { id: 'MEDIA_JAVA' as PresentacionHuevo, etiqueta: 'Media java', factor: 180 },
    { id: 'JAVA' as PresentacionHuevo, etiqueta: 'Java', factor: 360 },
  ];

  factorPresentacion(presentacion: PresentacionHuevo | null | undefined): number {
    return this.presentacionesHuevo.find((item) => item.id === presentacion)?.factor ?? 1;
  }

  get costoUnitarioCalculadoHuevos(): number | null {
    if (!this.loteEsHuevos) {
      return null;
    }

    const cantidadBase = Number(this.loteForm.cantidad ?? 0);
    const costoTotal = Number(this.loteForm.costoTotalHuevos ?? 0);

    if (cantidadBase <= 0 || costoTotal <= 0) {
      return null;
    }

    return Number((costoTotal / cantidadBase).toFixed(6));
  }

  actualizarCantidadBaseHuevos(): void {
    if (!this.loteEsHuevos) {
      return;
    }
    const cantidadPresentacion = Number(this.loteForm.cantidadPresentacion ?? 0);
    this.loteForm.cantidad = Number(
      (cantidadPresentacion * this.factorPresentacion(this.loteForm.presentacionIngreso)).toFixed(2)
    );
    this.loteForm.costoKilo = this.costoUnitarioCalculadoHuevos;
    this.loteForm.precioVenta = 0;
  }

  guardarLote(): void {
    if (this.loteEsHuevos) {
      this.actualizarCantidadBaseHuevos();
    }

    if (!this.loteForm.productoId || !this.loteForm.cantidad || !this.loteForm.proveedorId || this.loteForm.costoKilo === null || this.loteForm.costoKilo < 0 || !this.loteForm.codigoComprobante.trim()) {
      this.mensajeError = 'Completa todos los campos obligatorios del lote y detalle.';
      return;
    }

    this.mensajeError = '';
    const payload = {
      producto_id: this.loteForm.productoId,
      cantidad: this.loteForm.cantidad,
      costo_kilo: this.loteForm.costoKilo,
      costo_total_compra: this.loteEsHuevos ? this.loteForm.costoTotalHuevos : null,
      precio_venta: this.loteForm.precioVenta ?? 0,
      presentacion_ingreso: this.loteEsHuevos ? this.loteForm.presentacionIngreso : null,
      cantidad_presentacion: this.loteEsHuevos ? this.loteForm.cantidadPresentacion : null,
      codigo_comprobante: this.loteForm.codigoComprobante.trim(),
      fecha_ingreso: this.loteForm.fechaIngreso,
      proveedor_id: this.loteForm.proveedorId
    };

    const headers = this.obtenerHeaders();
    const request = this.loteEnEdicion
      ? this.http.put<LoteApi>(`/api/otros-productos/lotes/${this.loteEnEdicion.compraLoteId}`, payload, { headers })
      : this.http.post<LoteApi>('/api/otros-productos/lotes', payload, { headers });

    request.subscribe({
      next: (respuesta) => {
        const nuevoRegistro: LoteRegistro = {
          compraLoteId: respuesta.compra_lote_id,
          numeroLote: respuesta.numero_lote,
          nombre: respuesta.producto_nombre,
          productoId: respuesta.producto_id,
          cantidad: respuesta.cantidad,
          presentacionIngreso: respuesta.presentacion_ingreso,
          cantidadPresentacion: respuesta.cantidad_presentacion,
          factorConversion: respuesta.factor_conversion,
          costoKilo: respuesta.costo_kilo,
          costoTotalCompra: respuesta.costo_total_compra,
          precioVenta: respuesta.precio_venta,
          codigoComprobante: respuesta.codigo_comprobante,
          totalCosto: respuesta.costo_total_compra ?? respuesta.cantidad * respuesta.costo_kilo,
          totalVenta: respuesta.cantidad * respuesta.precio_venta,
          fechaIngreso: respuesta.fecha_ingreso,
          creadoEn: respuesta.creado_en,
          estado: respuesta.estado,
          proveedorId: respuesta.proveedor_id ?? null,
          proveedorNombre: this.obtenerNombreProveedor(respuesta.proveedor_id)
        };

        if (this.loteEnEdicion) {
          this.lotes = this.lotes.map((item) =>
            item.compraLoteId === this.loteEnEdicion?.compraLoteId ? nuevoRegistro : item
          );
        } else {
          this.lotes = [nuevoRegistro, ...this.lotes];
        }
        this.cerrarModal();
      },
      error: () => {
        this.mensajeError = 'No pudimos guardar el lote. Revisa los datos e intenta nuevamente.';
      }
    });
  }

  editarLote(lote: LoteRegistro): void {
    if (lote.estado === 'CERRADO') {
      return;
    }

    this.loteEnEdicion = lote;
    this.mostrarModal = true;
    this.filtroProducto = lote.nombre;
    this.filtroProveedor = lote.proveedorNombre;
    this.dropdownProductoAbierto = false;
    this.dropdownProveedorAbierto = false;
    this.loteForm = {
      fechaIngreso: lote.fechaIngreso,
      codigoComprobante: lote.codigoComprobante,
      productoId: lote.productoId,
      cantidad: lote.cantidad,
      presentacionIngreso: lote.presentacionIngreso ?? 'JAVA',
      cantidadPresentacion: lote.cantidadPresentacion,
      costoTotalHuevos: lote.totalCosto,
      costoKilo: lote.costoKilo,
      precioVenta: lote.precioVenta,
      proveedorId: lote.proveedorId
    };
  }

  eliminarLote(lote: LoteRegistro): void {
    if (lote.estado === 'CERRADO') {
      return;
    }

    const swal = (window as unknown as { Swal?: { fire: (options: Record<string, unknown>) => Promise<{ isConfirmed: boolean }> } }).Swal;
    if (!swal) {
      return;
    }

    swal
      .fire({
        title: 'Eliminar lote - ',
        text: 'Esta accion no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Si, eliminar',
        cancelButtonText: 'Cancelar'
      })
      .then((resultado) => {
        if (!resultado.isConfirmed) {
          return;
        }
        const headers = this.obtenerHeaders();
        this.http
          .delete(`/api/otros-productos/lotes/${lote.compraLoteId}`, { headers })
          .subscribe({
            next: () => {
              this.lotes = this.lotes.filter((item) => item.compraLoteId !== lote.compraLoteId);
              swal.fire({
                title: 'Eliminado',
                text: 'El lote se elimino correctamente.',
                icon: 'success',
              });
            },
            error: () => {
              this.mensajeError = 'No pudimos eliminar el lote. Intenta nuevamente.';
              swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar el lote.',
                icon: 'error',
              });
            }
          });
      });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private cargarProductos(): void {
    const headers = this.obtenerHeaders();
    this.http.get<ProductoApi[]>('/api/otros-productos/productos', { headers }).subscribe({
      next: (productos) => {
        this.productos = productos;
      },
      error: () => {
        this.mensajeError = 'No pudimos cargar los productos. Intenta nuevamente.';
      }
    });
  }

  private cargarLotes(): void {
    const headers = this.obtenerHeaders();
    this.http.get<LoteApi[]>('/api/otros-productos/lotes', { headers }).subscribe({
      next: (lotes) => {
        this.lotes = lotes.map((lote) => ({
          compraLoteId: lote.compra_lote_id,
          numeroLote: lote.numero_lote,
          nombre: lote.producto_nombre,
          productoId: lote.producto_id,
          cantidad: lote.cantidad,
          presentacionIngreso: lote.presentacion_ingreso,
          cantidadPresentacion: lote.cantidad_presentacion,
          factorConversion: lote.factor_conversion,
          costoKilo: lote.costo_kilo,
          costoTotalCompra: lote.costo_total_compra,
          precioVenta: lote.precio_venta,
          codigoComprobante: lote.codigo_comprobante,
          totalCosto: lote.costo_total_compra ?? lote.cantidad * lote.costo_kilo,
          totalVenta: lote.cantidad * lote.precio_venta,
          fechaIngreso: lote.fecha_ingreso,
          creadoEn: lote.creado_en,
          estado: lote.estado,
          proveedorId: lote.proveedor_id ?? null,
          proveedorNombre: this.formatearProveedorDesdeLote(lote),
        }));
      },
      error: () => {
        this.mensajeError = 'No pudimos cargar los lotes. Intenta nuevamente.';
      }
    });
  }

  private cargarProveedores(): void {
    const headers = this.obtenerHeaders();
    this.http.get<ProveedorApi[]>('/api/proveedores', { headers }).subscribe({
      next: (proveedores) => {
        this.proveedores = proveedores;
      },
      error: () => {
        this.mensajeError = 'No pudimos cargar los proveedores. Intenta nuevamente.';
      }
    });
  }

  formatearProveedor(proveedor: ProveedorApi): string {
    const nombrePersona = [proveedor.nombres, proveedor.apellidos].filter(Boolean).join(' ').trim();
    const nombreEmpresa = proveedor.nombre_empresa?.trim();
    const base = nombreEmpresa ? `${nombreEmpresa} - ${nombrePersona}` : nombrePersona;
    const documento = proveedor.ruc || proveedor.dni || '';
    return documento ? `${base} (${documento})` : base;
  }

  private formatearProveedorDesdeLote(lote: LoteApi): string {
    if (!lote.proveedor_id) {
      return 'Sin proveedor';
    }
    const nombrePersona = [lote.proveedor_nombres, lote.proveedor_apellidos].filter(Boolean).join(' ').trim();
    const nombreEmpresa = lote.proveedor_nombre_empresa?.trim();
    const base = nombreEmpresa ? `${nombreEmpresa} - ${nombrePersona}` : nombrePersona;
    const documento = lote.proveedor_ruc || lote.proveedor_dni || '';
    return documento ? `${base} (${documento})` : base;
  }

  private obtenerNombreProveedor(proveedorId: number | null): string {
    if (!proveedorId) {
      return 'Sin proveedor';
    }
    const proveedor = this.proveedores.find((item) => item.proveedor_id === proveedorId);
    return proveedor ? this.formatearProveedor(proveedor) : 'Proveedor pendiente';
  }

  @HostListener('document:click', ['$event'])
  cerrarDropdownExterno(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.selector-producto')) {
      this.dropdownProductoAbierto = false;
    }
    if (!target.closest('.selector-proveedor')) {
      this.dropdownProveedorAbierto = false;
    }
  }

  private obtenerFechaLocalISO(): string {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - offset).toISOString().slice(0, 10);
  }
}
