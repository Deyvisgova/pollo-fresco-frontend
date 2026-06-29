import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfiguracionEmpresa,
  ConfiguracionEmpresaServicio
} from '../../../servicios/configuracion-empresa.servicio';
import { SesionServicio } from '../../../servicios/sesion.servicio';

interface ConfiguracionSunat {
  ambiente: 'beta' | 'produccion';
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  direccion_fiscal: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  correo: string;
  usuario_sol: string;
  clave_sol: string;
  certificado_clave: string;
  activo: boolean;
  clave_sol_configurada?: boolean;
  certificado_configurado?: boolean;
}

@Component({
  selector: 'app-privado-configuracion',
  // Componente para editar la configuracion visual del modulo privado.
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class PrivadoConfiguracion implements OnInit {
  configuracion: ConfiguracionEmpresa;
  mensajeGuardado = '';
  mensajeError = '';
  subiendoLogo = false;
  eliminandoLogo = false;
  guardandoSunat = false;
  subiendoCertificado = false;
  mensajeSunat = '';
  errorSunat = '';
  certificado: File | null = null;
  sunat: ConfiguracionSunat = {
    ambiente: 'beta',
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    direccion_fiscal: '',
    ubigeo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    correo: '',
    usuario_sol: '',
    clave_sol: '',
    certificado_clave: '',
    activo: false
  };

  constructor(
    private readonly configuracionEmpresaServicio: ConfiguracionEmpresaServicio,
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {
    const configuracionActual = this.configuracionEmpresaServicio.configuracion();
    this.configuracion = {
      nombreEmpresa: configuracionActual.nombreEmpresa,
      logoUrl: configuracionActual.logoUrl
    };
  }

  ngOnInit(): void {
    this.cargarSunat();
  }

  private headers(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  cargarSunat(): void {
    this.http.get<{ configuracion: Partial<ConfiguracionSunat> | null }>('/api/configuracion/sunat', {
      headers: this.headers()
    }).subscribe({
      next: (respuesta) => {
        if (respuesta.configuracion) {
          this.sunat = { ...this.sunat, ...respuesta.configuracion, clave_sol: '', certificado_clave: '' };
        }
      },
      error: () => {
        this.errorSunat = 'No se pudo cargar la configuración SUNAT.';
      }
    });
  }

  guardarSunat(): void {
    this.guardandoSunat = true;
    this.mensajeSunat = '';
    this.errorSunat = '';
    this.http.put<Partial<ConfiguracionSunat>>('/api/configuracion/sunat', this.sunat, {
      headers: this.headers()
    }).subscribe({
      next: (respuesta) => {
        this.sunat = { ...this.sunat, ...respuesta, clave_sol: '', certificado_clave: '' };
        this.guardandoSunat = false;
        this.mensajeSunat = 'Configuración SUNAT guardada de forma segura.';
      },
      error: (error) => {
        this.guardandoSunat = false;
        this.errorSunat = error?.error?.message ?? 'No se pudo guardar la configuración SUNAT.';
      }
    });
  }

  seleccionarCertificado(evento: Event): void {
    this.certificado = (evento.target as HTMLInputElement).files?.[0] ?? null;
  }

  subirCertificado(): void {
    if (!this.certificado) {
      this.errorSunat = 'Selecciona un certificado PEM.';
      return;
    }
    const datos = new FormData();
    datos.append('certificado', this.certificado);
    if (this.sunat.certificado_clave) {
      datos.append('certificado_clave', this.sunat.certificado_clave);
    }
    this.subiendoCertificado = true;
    this.http.post<{ message: string }>('/api/configuracion/sunat/certificado', datos, {
      headers: this.headers()
    }).subscribe({
      next: (respuesta) => {
        this.subiendoCertificado = false;
        this.sunat.certificado_configurado = true;
        this.sunat.certificado_clave = '';
        this.mensajeSunat = respuesta.message;
      },
      error: (error) => {
        this.subiendoCertificado = false;
        this.errorSunat = error?.error?.message ?? 'No se pudo guardar el certificado.';
      }
    });
  }

  guardarConfiguracion(): void {
    this.configuracionEmpresaServicio.guardarConfiguracion(this.configuracion);
    this.mensajeError = '';
    this.mensajeGuardado = 'Configuracion guardada correctamente.';
  }

  seleccionarLogo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    this.subiendoLogo = true;
    this.mensajeGuardado = '';
    this.mensajeError = '';

    this.configuracionEmpresaServicio.subirLogo(archivo).subscribe({
      next: (logoUrl) => {
        this.configuracion.logoUrl = logoUrl;
        this.subiendoLogo = false;
        this.mensajeGuardado = 'Logo cargado correctamente.';
      },
      error: () => {
        this.subiendoLogo = false;
        this.mensajeError = 'No se pudo subir el logo. Intenta con otro formato de imagen.';
      }
    });
  }

  eliminarLogo(): void {
    if (!this.configuracion.logoUrl.trim()) {
      return;
    }

    this.eliminandoLogo = true;
    this.mensajeGuardado = '';
    this.mensajeError = '';

    this.configuracionEmpresaServicio.eliminarLogo().subscribe({
      next: () => {
        this.configuracion.logoUrl = '';
        this.eliminandoLogo = false;
        this.mensajeGuardado = 'Logo eliminado correctamente.';
      },
      error: () => {
        this.eliminandoLogo = false;
        this.mensajeError = 'No se pudo eliminar el logo. Intenta nuevamente.';
      }
    });
  }
}
