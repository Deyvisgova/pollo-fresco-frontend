import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmacionServicio } from '../../../../servicios/confirmacion.servicio';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface ProveedorApi {
  proveedor_id: number;
  dni: string | null;
  ruc: string | null;
  nombres: string;
  apellidos: string | null;
  nombre_empresa: string | null;
  direccion: string | null;
  telefono: string | null;
  creado_en: string;
  actualizado_en: string;
}

interface ProveedorFormulario {
  proveedor_id: number | null;
  dni: string;
  ruc: string;
  nombres: string;
  apellidos: string;
  nombreEmpresa: string;
  direccion: string;
  telefono: string;
}

@Component({
  selector: 'app-privado-proveedores-crud',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './proveedores-crud.html',
  styleUrl: './proveedores-crud.css'
})
export class PrivadoProveedoresCrud implements OnInit {
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

  consultaDocumento = '';
  consultaResultado: Record<string, unknown> | null = null;
  consultaError = '';
  consultaCargando = false;
  cargando = false;
  guardando = false;
  mostrarModalRegistro = false;
  filtro = '';

  proveedores: ProveedorApi[] = [];

  formulario: ProveedorFormulario = {
    proveedor_id: null,
    dni: '',
    ruc: '',
    nombres: '',
    apellidos: '',
    nombreEmpresa: '',
    direccion: '',
    telefono: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly confirmacionServicio: ConfirmacionServicio,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    if (this.esVendedor) {
      void this.router.navigate(['/privado/proveedores/registros']);
      return;
    }

    this.cargarProveedores();
  }

  get esVendedor(): boolean {
    return this.sesionServicio.usuarioEsRol('vendedor');
  }

  abrirModalRegistro(): void {
    if (this.esVendedor) {
      return;
    }

    this.limpiarFormulario();
    this.mostrarModalRegistro = true;
  }

  cerrarModalRegistro(): void {
    this.mostrarModalRegistro = false;
    this.consultaCargando = false;
    this.guardando = false;
    this.consultaError = '';
  }

  onFiltroChange(): void {
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }

    this.temporizadorBusqueda = setTimeout(() => {
      this.cargarProveedores(this.filtro);
    }, 250);
  }

  consultarDocumentoApi(): void {
    this.consultaError = '';
    this.consultaResultado = null;

    const documento = this.consultaDocumento.trim();

    if (!documento) {
      this.consultaError = 'Ingresa el DNI o RUC para consultar.';
      return;
    }

    if (!/^\d+$/.test(documento)) {
      this.consultaError = 'El documento solo debe contener digitos.';
      return;
    }

    if (documento.length === 8) {
      this.consultarApi(`dni/${documento}`, this.autocompletarDesdeDni.bind(this));
      return;
    }

    if (documento.length === 11) {
      this.consultarApi(`ruc/${documento}`, this.autocompletarDesdeRuc.bind(this));
      return;
    }

    this.consultaError = 'El documento debe tener 8 digitos (DNI) o 11 digitos (RUC).';
  }

  guardarProveedor(): void {
    if (this.esVendedor) {
      return;
    }

    this.guardando = true;
    this.consultaError = '';

    const payload = {
      dni: this.formulario.dni || null,
      ruc: this.formulario.ruc || null,
      nombres: this.formulario.nombres || '',
      apellidos: this.formulario.apellidos || '',
      nombre_empresa: this.formulario.nombreEmpresa || '',
      direccion: this.formulario.direccion || '',
      telefono: this.formulario.telefono || ''
    };

    const headers = this.obtenerHeaders();
    const request = this.formulario.proveedor_id
      ? this.http.put<ProveedorApi>(`/api/proveedores/${this.formulario.proveedor_id}`, payload, { headers })
      : this.http.post<ProveedorApi>('/api/proveedores', payload, { headers });

    request.subscribe({
      next: () => {
        this.cargarProveedores(this.filtro);
        this.cerrarModalRegistro();
        this.limpiarFormulario();
      },
      error: (error) => {
        if (error?.status === 401) {
          this.consultaError = 'Tu sesion expiro. Inicia sesion nuevamente para guardar el proveedor.';
          return;
        }

        const errores = error?.error?.errors as Record<string, string[]> | undefined;
        if (errores) {
          const primerError = Object.values(errores)?.[0]?.[0];
          if (primerError) {
            this.consultaError = primerError;
            return;
          }
        }

        this.consultaError = error?.error?.message || 'No se pudo guardar el proveedor. Revisa los datos e intenta nuevamente.';
      },
      complete: () => {
        this.guardando = false;
      }
    });
  }

  editarProveedor(proveedor: ProveedorApi): void {
    if (this.esVendedor) {
      return;
    }

    this.formulario = {
      proveedor_id: proveedor.proveedor_id,
      dni: proveedor.dni ?? '',
      ruc: proveedor.ruc ?? '',
      nombres: proveedor.nombres,
      apellidos: proveedor.apellidos ?? '',
      nombreEmpresa: proveedor.nombre_empresa ?? '',
      direccion: proveedor.direccion ?? '',
      telefono: proveedor.telefono ?? ''
    };
    this.consultaDocumento = proveedor.ruc ?? proveedor.dni ?? '';
    this.mostrarModalRegistro = true;
  }

  async eliminarProveedor(proveedor: ProveedorApi): Promise<void> {
    if (this.esVendedor) {
      return;
    }

    this.consultaError = '';

    const nombre = proveedor.nombre_empresa || `${proveedor.nombres} ${proveedor.apellidos ?? ''}`.trim();
    const confirmar = await this.confirmacionServicio.confirmar({
      titulo: 'Eliminar proveedor',
      mensaje: `Deseas eliminar a ${nombre}?`,
      detalle: 'Si tiene movimientos asociados, el sistema puede impedir la eliminacion.',
      textoConfirmar: 'Eliminar',
      tipo: 'peligro'
    });
    if (!confirmar) {
      return;
    }

    const headers = this.obtenerHeaders();
    this.http.delete(`/api/proveedores/${proveedor.proveedor_id}`, { headers }).subscribe({
      next: () => this.cargarProveedores(this.filtro),
      error: (error) => {
        if (error?.status === 401) {
          this.consultaError = 'Tu sesion expiro. Inicia sesion nuevamente para eliminar el proveedor.';
          return;
        }

        this.consultaError = error?.error?.message || 'No se pudo eliminar el proveedor.';
      }
    });
  }

  limpiarFormulario(): void {
    this.consultaDocumento = '';
    this.consultaResultado = null;
    this.consultaError = '';

    this.formulario = {
      proveedor_id: null,
      dni: '',
      ruc: '',
      nombres: '',
      apellidos: '',
      nombreEmpresa: '',
      direccion: '',
      telefono: ''
    };
  }

  private consultarApi(
    endpoint: string,
    autocompletar: (datos: Record<string, unknown>) => void
  ): void {
    const url = `/api/documentos/${endpoint}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url, { headers: this.obtenerHeaders() }).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        this.consultaResultado = datos;
        autocompletar(datos);
        this.consultaDocumento = '';
      },
      error: () => {
        this.consultaError = 'No pudimos conectar con la SUNAT/RENIEC. Revisa el numero e intenta nuevamente.';
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

    this.formulario = {
      ...this.formulario,
      dni: ((datos['numero'] as string) ?? this.consultaDocumento).toString(),
      nombres: nombres || (datos['nombre_completo'] as string) || this.formulario.nombres,
      apellidos:
        `${apellidoPaterno} ${apellidoMaterno}`.trim() ||
        (datos['apellido'] as string) ||
        this.formulario.apellidos,
      nombreEmpresa: this.formulario.nombreEmpresa
    };
  }

  private autocompletarDesdeRuc(datos: Record<string, unknown>): void {
    const nombreEmpresa =
      (datos['nombre_o_razon_social'] as string) ??
      (datos['razon_social'] as string) ??
      (datos['nombre_comercial'] as string) ??
      '';

    this.formulario = {
      ...this.formulario,
      ruc: ((datos['numero'] as string) ?? this.consultaDocumento).toString(),
      nombres: this.formulario.nombres,
      apellidos: this.formulario.apellidos,
      nombreEmpresa: nombreEmpresa || this.formulario.nombreEmpresa,
      direccion: (datos['direccion'] as string) ?? this.formulario.direccion
    };
  }

  private cargarProveedores(search?: string): void {
    this.cargando = true;
    this.consultaError = '';
    const headers = this.obtenerHeaders();
    const options: { headers: HttpHeaders; params?: Record<string, string> } = { headers };

    if (search && search.trim()) {
      options.params = { search: search.trim() };
    }

    this.http.get<ProveedorApi[]>('/api/proveedores', options).subscribe({
      next: (proveedores) => {
        this.proveedores = proveedores;
      },
      error: () => {
        this.consultaError = 'No se pudo cargar la lista de proveedores.';
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    const headersBase = new HttpHeaders({ Accept: 'application/json' });

    return token
      ? headersBase.set('Authorization', `Bearer ${token}`)
      : headersBase;
  }
}
