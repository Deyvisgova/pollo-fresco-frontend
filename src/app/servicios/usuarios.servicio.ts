import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SesionServicio } from './sesion.servicio';

export interface UsuarioApi {
  usuario_id: number;
  rol_id: number;
  roles_permitidos?: number[] | null;
  roles_disponibles?: Array<{ id: number; nombre: string; role: string }>;
  nombres: string;
  apellidos: string;
  usuario: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface UsuarioPayload {
  rol_id: number;
  roles_permitidos: number[];
  nombres: string;
  apellidos: string;
  usuario: string;
  email: string;
  telefono: string;
  password: string | null;
  password_confirmation: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuariosServicio {
  private readonly apiBase = '/api/usuarios';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  listar(): Observable<UsuarioApi[]> {
    return this.http.get<UsuarioApi[]>(this.apiBase, {
      headers: this.obtenerHeaders()
    });
  }

  crear(payload: UsuarioPayload): Observable<UsuarioApi> {
    return this.http.post<UsuarioApi>(this.apiBase, payload, {
      headers: this.obtenerHeaders()
    });
  }

  actualizar(usuarioId: number, payload: UsuarioPayload): Observable<UsuarioApi> {
    return this.http.put<UsuarioApi>(`${this.apiBase}/${usuarioId}`, payload, {
      headers: this.obtenerHeaders()
    });
  }

  eliminar(usuarioId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${usuarioId}`, {
      headers: this.obtenerHeaders()
    });
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
