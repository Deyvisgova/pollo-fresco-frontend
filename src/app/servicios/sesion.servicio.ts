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
 * Se guarda en localStorage para mantener el acceso mientras el usuario navega.
 */
@Injectable({ providedIn: 'root' })
export class SesionServicio {
  // Llaves usadas en localStorage para mantener coherencia en toda la app.
  private readonly llaveUsuario = 'usuario_actual';
  private readonly llaveToken = 'token_api';

  /**
   * Guarda el usuario y token emitidos por el backend luego del inicio de sesion.
   */
  guardarSesion(usuario: UsuarioSesion, token: string): void {
    localStorage.setItem(this.llaveUsuario, JSON.stringify(usuario));
    localStorage.setItem(this.llaveToken, token);
  }

  /**
   * Obtiene el usuario guardado, si existe.
   */
  obtenerUsuario(): UsuarioSesion | null {
    const data = localStorage.getItem(this.llaveUsuario);
    return data ? (JSON.parse(data) as UsuarioSesion) : null;
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
    return localStorage.getItem(this.llaveToken);
  }

  /**
   * Limpia toda la sesion local.
   */
  limpiarSesion(): void {
    localStorage.removeItem(this.llaveUsuario);
    localStorage.removeItem(this.llaveToken);
  }
}
