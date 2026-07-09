import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface ClienteApi {
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
  creado_en: string;
  actualizado_en: string;
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

@Component({
  selector: 'app-privado-clientes-crud',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './clientes-crud.html',
  styleUrl: './clientes-crud.css'
})
export class PrivadoClientesCrud implements OnInit {
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

  consultaDocumento = '';
  consultaCargando = false;
  guardando = false;
  cargando = false;
  mensajeError = '';
  filtro = '';
  mostrarModalRegistro = false;

  clientes: ClienteApi[] = [];

  formulario: ClienteFormulario = {
    cliente_id: null,
    dni: '',
    ruc: '',
    nombres: '',
    apellidos: '',
    nombreEmpresa: '',
    celular: '',
    direccion: '',
    direccionFiscal: '',
    referencias: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
  }

  get esVendedor(): boolean {
    return this.sesionServicio.usuarioEsRol('vendedor');
  }

  abrirModalRegistro(): void {
    this.limpiarFormulario();
    this.mostrarModalRegistro = true;
  }

  cerrarModalRegistro(): void {
    this.mostrarModalRegistro = false;
    this.consultaCargando = false;
    this.guardando = false;
    this.mensajeError = '';
  }

  onFiltroChange(): void {
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }

    this.temporizadorBusqueda = setTimeout(() => {
      this.cargarClientes(this.filtro);
    }, 250);
  }

  consultarDocumentoApi(): void {
    this.mensajeError = '';

    const documento = this.consultaDocumento.trim();

    if (!documento) {
      this.mensajeError = 'Ingresa el DNI o RUC para consultar.';
      return;
    }

    if (!/^\d+$/.test(documento)) {
      this.mensajeError = 'El documento solo debe contener digitos.';
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

    this.mensajeError = 'El documento debe tener 8 digitos (DNI) o 11 digitos (RUC).';
  }

  guardarCliente(): void {
    this.mensajeError = '';

    this.guardando = true;

    const payload = {
      dni: this.formulario.dni || null,
      ruc: this.formulario.ruc || null,
      nombres: this.formulario.nombres || '',
      apellidos: this.formulario.apellidos || '',
      nombre_empresa: this.formulario.nombreEmpresa || null,
      celular: this.formulario.celular || null,
      direccion: this.formulario.direccion || null,
      direccion_fiscal: this.formulario.direccionFiscal || null,
      referencias: this.formulario.referencias || null
    };

    const headers = this.obtenerHeaders();
    const request = this.formulario.cliente_id
      ? this.http.put<ClienteApi>(`/api/clientes/${this.formulario.cliente_id}`, payload, { headers })
      : this.http.post<ClienteApi>('/api/clientes', payload, { headers });

    request.subscribe({
      next: () => {
        this.cargarClientes(this.filtro);
        this.cerrarModalRegistro();
        this.limpiarFormulario();
      },
      error: (error) => {
        const errores = error?.error?.errors as Record<string, string[]> | undefined;
        if (errores) {
          const primerError = Object.values(errores)?.[0]?.[0];
          if (primerError) {
            this.mensajeError = primerError;
            return;
          }
        }

        this.mensajeError = 'No se pudo guardar el cliente. Revisa los datos e intenta nuevamente.';
      },
      complete: () => {
        this.guardando = false;
      }
    });
  }

  editarCliente(cliente: ClienteApi): void {
    if (this.esVendedor) {
      return;
    }

    this.formulario = {
      cliente_id: cliente.cliente_id,
      dni: cliente.dni ?? '',
      ruc: cliente.ruc ?? '',
      nombres: cliente.nombres ?? '',
      apellidos: cliente.apellidos ?? '',
      nombreEmpresa: cliente.nombre_empresa ?? '',
      celular: cliente.celular ?? '',
      direccion: cliente.direccion ?? '',
      direccionFiscal: cliente.direccion_fiscal ?? '',
      referencias: cliente.referencias ?? ''
    };
    this.consultaDocumento = cliente.ruc ?? cliente.dni ?? '';
    this.mostrarModalRegistro = true;
  }

  eliminarCliente(cliente: ClienteApi): void {
    if (this.esVendedor) {
      return;
    }

    const headers = this.obtenerHeaders();
    this.http.delete(`/api/clientes/${cliente.cliente_id}`, { headers }).subscribe({
      next: () => this.cargarClientes(this.filtro),
      error: (error) => {
        this.mensajeError = error?.error?.message || 'No se pudo eliminar el cliente.';
      }
    });
  }

  limpiarFormulario(): void {
    this.consultaDocumento = '';
    this.formulario = {
      cliente_id: null,
      dni: '',
      ruc: '',
      nombres: '',
      apellidos: '',
      nombreEmpresa: '',
      celular: '',
      direccion: '',
      direccionFiscal: '',
      referencias: ''
    };
  }

  private consultarApi(endpoint: string, autocompletar: (datos: Record<string, unknown>) => void): void {
    const url = `/api/documentos/${endpoint}`;

    this.consultaCargando = true;
    this.http.get<Record<string, unknown>>(url).subscribe({
      next: (respuesta) => {
        const datos = (respuesta?.['data'] as Record<string, unknown>) ?? {};
        autocompletar(datos);
      },
      error: () => {
        this.mensajeError = 'No pudimos conectar con la SUNAT/RENIEC. Revisa el numero e intenta nuevamente.';
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
        this.formulario.apellidos
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
      nombreEmpresa: nombreEmpresa || this.formulario.nombreEmpresa,
      direccionFiscal: (datos['direccion'] as string) ?? this.formulario.direccionFiscal
    };
  }

  private cargarClientes(search?: string): void {
    this.cargando = true;
    this.mensajeError = '';
    const headers = this.obtenerHeaders();
    const options: { headers: HttpHeaders; params?: Record<string, string> } = { headers };

    if (search && search.trim()) {
      options.params = { search: search.trim() };
    }

    this.http.get<ClienteApi[]>('/api/clientes', options).subscribe({
      next: (clientes) => {
        this.clientes = clientes;
      },
      error: () => {
        this.mensajeError = 'No se pudo cargar la lista de clientes.';
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
