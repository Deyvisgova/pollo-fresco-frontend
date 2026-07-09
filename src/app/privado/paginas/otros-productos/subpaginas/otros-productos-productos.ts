import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmacionServicio } from '../../../../servicios/confirmacion.servicio';
import { SesionServicio } from '../../../../servicios/sesion.servicio';
import { SelectBonitoDirective } from '../../../../compartido/directivas/select-bonito.directive';

interface ProductoRegistro {
  id: number;
  nombre: string;
  grupoVenta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
  activo: boolean;
}

interface ProductoApi {
  id: number;
  nombre: string;
  grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
  activo: number | boolean;
}

interface ProductoFormulario {
  nombre: string;
  grupoVenta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
  activo: boolean;
}

@Component({
  selector: 'app-privado-otros-productos-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SelectBonitoDirective],
  templateUrl: './otros-productos-productos.html',
  styleUrl: './otros-productos-productos.css'
})
export class PrivadoOtrosProductosProductos implements OnInit {
  productos: ProductoRegistro[] = [];
  filtro = '';
  cargando = false;
  mensajeError = '';
  mostrarModal = false;
  modoEdicion = false;
  productoSeleccionado: ProductoRegistro | null = null;
  formulario: ProductoFormulario = this.crearFormularioVacio();

  constructor(
    private readonly http: HttpClient,
    private readonly confirmacionServicio: ConfirmacionServicio,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  get productosFiltrados(): ProductoRegistro[] {
    const valor = this.filtro.trim().toLowerCase();
    if (!valor) {
      return this.productos;
    }
    return this.productos.filter((producto) => {
      const contenido = [
        producto.id,
        producto.nombre,
        producto.grupoVenta,
        producto.activo ? 'activo' : 'inactivo'
      ]
        .join(' ')
        .toLowerCase();
      return contenido.includes(valor);
    });
  }

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.productoSeleccionado = null;
    this.formulario = this.crearFormularioVacio();
    this.mostrarModal = true;
  }

  seleccionarProducto(producto: ProductoRegistro): void {
    this.modoEdicion = true;
    this.productoSeleccionado = producto;
    this.formulario = {
      nombre: producto.nombre,
      grupoVenta: producto.grupoVenta,
      activo: producto.activo
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.mensajeError = '';
  }

  guardarProducto(): void {
    if (this.modoEdicion && this.productoSeleccionado) {
      this.actualizarProducto();
    } else {
      this.crearProducto();
    }
  }

  async eliminarProducto(producto: ProductoRegistro): Promise<void> {
    const confirmacion = await this.confirmacionServicio.confirmar({
      titulo: 'Eliminar producto',
      mensaje: `Deseas eliminar el producto ${producto.nombre}?`,
      detalle: 'Solo confirma si ya no debe estar disponible en el sistema.',
      textoConfirmar: 'Eliminar',
      tipo: 'peligro'
    });
    if (!confirmacion) {
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    const headers = this.obtenerHeaders();
    this.http
      .delete<{ id: number }>(`/api/otros-productos/productos/${producto.id}`, { headers })
      .subscribe({
        next: () => {
          this.productos = this.productos.filter((item) => item.id !== producto.id);
          this.cargando = false;
        },
        error: () => {
          this.mensajeError = 'No pudimos eliminar el producto. Intenta nuevamente.';
          this.cargando = false;
        }
      });
  }

  obtenerEstadoTexto(producto: ProductoRegistro): string {
    return producto.activo ? 'ACTIVO' : 'INACTIVO';
  }

  async toggleActivo(producto: ProductoRegistro): Promise<void> {
    const nuevoEstado = !producto.activo;
    const accion = nuevoEstado ? 'activar' : 'inactivar';
    const confirmacion = await this.confirmacionServicio.confirmar({
      titulo: nuevoEstado ? 'Activar producto' : 'Inactivar producto',
      mensaje: `Deseas ${accion} el producto ${producto.nombre}?`,
      textoConfirmar: nuevoEstado ? 'Activar' : 'Inactivar',
      tipo: nuevoEstado ? 'normal' : 'advertencia'
    });
    if (!confirmacion) {
      return;
    }

    this.actualizarEstado(producto, nuevoEstado);
  }

  private crearProducto(): void {
    const nombre = this.formulario.nombre.trim();
    if (!nombre) {
      this.mensajeError = 'El nombre del producto es obligatorio.';
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    const headers = this.obtenerHeaders();
    this.http
      .post<ProductoApi>(
        '/api/otros-productos/productos',
        { nombre, grupo_venta: this.formulario.grupoVenta },
        { headers }
      )
      .subscribe({
        next: (producto) => {
          this.productos = [
            {
              id: producto.id,
              nombre: producto.nombre,
              grupoVenta: producto.grupo_venta,
              activo: this.normalizarActivo(producto.activo)
            },
            ...this.productos
          ];
          this.cerrarModal();
          this.formulario = this.crearFormularioVacio();
          this.cargando = false;
        },
        error: () => {
          this.mensajeError = 'No pudimos guardar el producto. Intenta nuevamente.';
          this.cargando = false;
        }
      });
  }

  private actualizarProducto(): void {
    if (!this.productoSeleccionado) {
      return;
    }

    const nombre = this.formulario.nombre.trim();
    if (!nombre) {
      this.mensajeError = 'El nombre del producto es obligatorio.';
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    const headers = this.obtenerHeaders();
    const payload = {
      nombre,
      grupo_venta: this.formulario.grupoVenta,
      activo: this.formulario.activo
    };
    this.http
      .put<ProductoApi>(
        `/api/otros-productos/productos/${this.productoSeleccionado.id}`,
        payload,
        { headers }
      )
      .subscribe({
        next: (producto) => {
          this.productos = this.productos.map((item) =>
            item.id === producto.id ? {
                  id: producto.id,
                  nombre: producto.nombre,
                  grupoVenta: producto.grupo_venta,
                  activo: this.normalizarActivo(producto.activo)
                }
              : item
          );
          this.cerrarModal();
          this.formulario = this.crearFormularioVacio();
          this.cargando = false;
        },
        error: () => {
          this.mensajeError = 'No pudimos actualizar el producto. Intenta nuevamente.';
          this.cargando = false;
        }
      });
  }

  private actualizarEstado(producto: ProductoRegistro, activo: boolean): void {
    this.cargando = true;
    this.mensajeError = '';
    const headers = this.obtenerHeaders();
    const payload = {
      nombre: producto.nombre,
      grupo_venta: producto.grupoVenta,
      activo
    };
    this.http
      .put<ProductoApi>(`/api/otros-productos/productos/${producto.id}`, payload, {
        headers
      })
      .subscribe({
        next: (respuesta) => {
          this.productos = this.productos.map((item) =>
            item.id === producto.id ? {
                  id: respuesta.id,
                  nombre: respuesta.nombre,
                  grupoVenta: respuesta.grupo_venta,
                  activo: this.normalizarActivo(respuesta.activo)
                }
              : item
          );
          this.cargando = false;
        },
        error: () => {
          this.mensajeError = 'No pudimos actualizar el estado del producto.';
          this.cargando = false;
        }
      });
  }

  private cargarProductos(): void {
    this.cargando = true;
    this.mensajeError = '';
    const headers = this.obtenerHeaders();
    this.http
      .get<ProductoApi[]>('/api/otros-productos/productos?incluir_inactivos=1', { headers })
      .subscribe({
        next: (productos) => {
          this.productos = productos.map((producto) => ({
            id: producto.id,
            nombre: producto.nombre,
            grupoVenta: producto.grupo_venta,
            activo: this.normalizarActivo(producto.activo)
          }));
          this.cargando = false;
        },
        error: () => {
          this.mensajeError = 'No pudimos cargar los productos. Intenta nuevamente.';
          this.cargando = false;
        }
      });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private crearFormularioVacio(): ProductoFormulario {
    return {
      nombre: '',
      grupoVenta: 'HUEVOS',
      activo: true
    };
  }

  private normalizarActivo(activo: number | boolean): boolean {
    return Boolean(Number(activo));
  }
}
