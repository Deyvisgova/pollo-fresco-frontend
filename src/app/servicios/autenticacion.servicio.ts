import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { SesionServicio, UsuarioSesion } from './sesion.servicio';

export interface CredencialesIngreso {
  usuario: string;
  password: string;
  role?: string;
}

export interface RolDisponibleLogin {
  id: number;
  nombre: string;
  role: string;
}

export interface RespuestaLoginApi {
  message: string;
  user: UsuarioSesion;
  token?: string;
  requires_role_selection?: boolean;
  roles?: RolDisponibleLogin[];
}

/**
 * Servicio de autenticacion que centraliza el inicio de sesion
 * contra la API de Laravel.
 */
@Injectable({ providedIn: 'root' })
export class AutenticacionServicio {
  // URL base de la API. Ajustar si cambia el dominio o puerto.
  private readonly apiBase = '/api';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  /**
   * Envia las credenciales al backend, guarda la sesion y retorna el usuario autenticado.
   */
  iniciarSesion(credenciales: CredencialesIngreso): Observable<RespuestaLoginApi> {
    return this.http
      .post<RespuestaLoginApi>(`${this.apiBase}/auth/login`, credenciales)
      .pipe(
        tap((respuesta) => {
          if (respuesta.token) {
            this.sesionServicio.guardarSesion(respuesta.user, respuesta.token);
          }
        })
      );
  }

  /**
   * Cierra la sesion actual en el backend y limpia la sesion local.
   */
  cerrarSesion(): Observable<void> {
    const token = this.sesionServicio.obtenerToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return this.http
      .post<{ message: string }>(`${this.apiBase}/auth/logout`, {}, { headers })
      .pipe(
        tap(() => this.sesionServicio.limpiarSesion()),
        map(() => undefined),
        catchError((error) => {
          this.sesionServicio.limpiarSesion();
          return throwError(() => error);
        })
      );
  }
}
