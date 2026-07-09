import { Injectable } from '@angular/core';

export interface UsuarioSesion {
  id: number;
  name: string;
  usuario?: string;
  email: string;
  role?: string;
}

/**
 * Servicio encargado de persistir la informacion de sesion.
 * La sesion se conserva solo en la pestana actual y expira junto con el token.
 */
@Injectable({ providedIn: 'root' })
export class SesionServicio {
  private readonly llaveUsuario = 'usuario_actual';
  private readonly llaveToken = 'token_api';
  private readonly llaveExpiracion = 'token_expira_en';
  private readonly duracionSesionMs = 8 * 60 * 60 * 1000;

  constructor() {
    localStorage.removeItem(this.llaveUsuario);
    localStorage.removeItem(this.llaveToken);
  }

  /**
   * Guarda el usuario y token emitidos por el backend luego del inicio de sesion.
   */
  guardarSesion(usuario: UsuarioSesion, token: string): void {
    sessionStorage.setItem(this.llaveUsuario, JSON.stringify(usuario));
    sessionStorage.setItem(this.llaveToken, token);
    sessionStorage.setItem(this.llaveExpiracion, String(Date.now() + this.duracionSesionMs));
  }

  /**
   * Obtiene el usuario guardado, si existe.
   */
  obtenerUsuario(): UsuarioSesion | null {
    const data = sessionStorage.getItem(this.llaveUsuario);
    if (!data || this.sesionExpirada()) {
      this.limpiarSesion();
      return null;
    }

    try {
      return JSON.parse(data) as UsuarioSesion;
    } catch {
      this.limpiarSesion();
      return null;
    }
  }

  obtenerRol(): string {
    return (this.obtenerUsuario()?.role ?? '').toLowerCase();
  }

  usuarioEsRol(rol: string): boolean {
    const rolNormalizado = rol.toLowerCase();
    const rolActual = this.obtenerRol();

    if (rolNormalizado === 'vendedor') {
      return ['vendedor', 'vendor', 'cashier'].includes(rolActual);
    }

    return rolActual === rolNormalizado;
  }

  /**
   * Obtiene el token actual para llamadas autenticadas.
   */
  obtenerToken(): string | null {
    if (this.sesionExpirada()) {
      this.limpiarSesion();
      return null;
    }

    return sessionStorage.getItem(this.llaveToken);
  }

  /**
   * Limpia toda la sesion local.
   */
  limpiarSesion(): void {
    sessionStorage.removeItem(this.llaveUsuario);
    sessionStorage.removeItem(this.llaveToken);
    sessionStorage.removeItem(this.llaveExpiracion);
  }

  private sesionExpirada(): boolean {
    const expiracion = Number(sessionStorage.getItem(this.llaveExpiracion) ?? 0);
    return expiracion > 0 && Date.now() >= expiracion;
  }
}
