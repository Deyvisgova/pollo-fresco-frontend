import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { SesionServicio } from './sesion.servicio';

export interface ConfiguracionEmpresa {
  nombreEmpresa: string;
  logoUrl: string;
}

interface RespuestaSubidaLogo {
  logo_url: string;
}

interface RespuestaConfiguracionEmpresa {
  nombre_empresa: string;
  logo_url: string | null;
}

const CONFIGURACION_POR_DEFECTO: ConfiguracionEmpresa = {
  nombreEmpresa: 'Nombre de la empresa',
  logoUrl: ''
};

@Injectable({ providedIn: 'root' })
export class ConfiguracionEmpresaServicio {
  private readonly llaveConfiguracion = 'configuracion_empresa';
  private readonly apiBase = '/api';
  readonly configuracion = signal<ConfiguracionEmpresa>(CONFIGURACION_POR_DEFECTO);

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {
    this.cargarConfiguracion();
    this.sincronizarConServidor().subscribe({ error: () => undefined });
  }

  guardarConfiguracion(configuracion: ConfiguracionEmpresa): void {
    const configuracionLimpia: ConfiguracionEmpresa = {
      nombreEmpresa: configuracion.nombreEmpresa.trim() || CONFIGURACION_POR_DEFECTO.nombreEmpresa,
      logoUrl: configuracion.logoUrl.trim()
    };

    localStorage.setItem(this.llaveConfiguracion, JSON.stringify(configuracionLimpia));
    this.configuracion.set(configuracionLimpia);
  }

  guardarConfiguracionServidor(configuracion: ConfiguracionEmpresa): Observable<ConfiguracionEmpresa> {
    const nombreEmpresa = configuracion.nombreEmpresa.trim() || CONFIGURACION_POR_DEFECTO.nombreEmpresa;

    return this.http
      .put<RespuestaConfiguracionEmpresa>(`${this.apiBase}/configuracion/empresa`, {
        nombre_empresa: nombreEmpresa
      }, {
        headers: this.obtenerHeadersAutenticados()
      })
      .pipe(
        map((respuesta) => this.mapearRespuesta(respuesta)),
        tap((configuracionActualizada) => this.guardarConfiguracion(configuracionActualizada))
      );
  }

  sincronizarConServidor(): Observable<ConfiguracionEmpresa> {
    return this.http
      .get<RespuestaConfiguracionEmpresa>(`${this.apiBase}/configuracion/empresa`, {
        headers: this.obtenerHeadersAutenticados()
      })
      .pipe(
        map((respuesta) => this.mapearRespuesta(respuesta)),
        tap((configuracionActualizada) => this.guardarConfiguracion(configuracionActualizada))
      );
  }

  subirLogo(archivo: File): Observable<string> {
    const formData = new FormData();
    formData.append('logo', archivo);

    return this.http
      .post<RespuestaSubidaLogo>(`${this.apiBase}/configuracion/logo`, formData, {
        headers: this.obtenerHeadersAutenticados()
      })
      .pipe(
        map((respuesta) => respuesta.logo_url),
        tap((logoUrl) => {
          const actual = this.configuracion();
          this.guardarConfiguracion({ ...actual, logoUrl });
        })
      );
  }

  eliminarLogo(): Observable<void> {
    const logoUrl = this.configuracion().logoUrl;

    return this.http
      .request<void>('DELETE', `${this.apiBase}/configuracion/logo`, {
        headers: this.obtenerHeadersAutenticados(),
        body: { logo_url: logoUrl }
      })
      .pipe(
        tap(() => {
          const actual = this.configuracion();
          this.guardarConfiguracion({ ...actual, logoUrl: '' });
        })
      );
  }

  private obtenerHeadersAutenticados(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private cargarConfiguracion(): void {
    const data = localStorage.getItem(this.llaveConfiguracion);

    if (!data) {
      this.configuracion.set(CONFIGURACION_POR_DEFECTO);
      return;
    }

    try {
      const configuracion = JSON.parse(data) as Partial<ConfiguracionEmpresa>;
      this.configuracion.set({
        nombreEmpresa: configuracion.nombreEmpresa?.trim() || CONFIGURACION_POR_DEFECTO.nombreEmpresa,
        logoUrl: configuracion.logoUrl?.trim() || ''
      });
    } catch {
      this.configuracion.set(CONFIGURACION_POR_DEFECTO);
    }
  }

  private mapearRespuesta(respuesta: RespuestaConfiguracionEmpresa): ConfiguracionEmpresa {
    return {
      nombreEmpresa: respuesta.nombre_empresa?.trim() || CONFIGURACION_POR_DEFECTO.nombreEmpresa,
      logoUrl: respuesta.logo_url?.trim() || ''
    };
  }
}
