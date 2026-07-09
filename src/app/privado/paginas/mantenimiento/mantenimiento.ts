import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SesionServicio } from '../../../servicios/sesion.servicio';

interface RespaldoBaseDatos {
  archivo: string;
  tipo: string;
  tamano_bytes: number;
  creado_en: string;
  checksum: string;
}

interface AuditoriaMantenimiento {
  mantenimiento_auditoria_id: number;
  usuario?: string;
  accion: string;
  archivo?: string;
  estado: string;
  detalle?: string;
  creado_en: string;
}

interface RespuestaMantenimiento {
  respaldos: RespaldoBaseDatos[];
  auditoria: AuditoriaMantenimiento[];
  programacion: Record<string, string>;
}

type AccionCritica = 'restaurar' | 'reiniciar';

@Component({
  selector: 'app-privado-mantenimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './mantenimiento.html',
  styleUrl: './mantenimiento.css'
})
export class PrivadoMantenimiento implements OnInit {
  respaldos: RespaldoBaseDatos[] = [];
  auditoria: AuditoriaMantenimiento[] = [];
  programacion: Record<string, string> = {};
  cargando = true;
  creando = false;
  descargando = '';
  mensaje = '';
  error = '';

  modalAbierto = false;
  accionCritica: AccionCritica = 'restaurar';
  respaldoSeleccionado: RespaldoBaseDatos | null = null;
  password = '';
  confirmacion = '';
  procesando = false;

  constructor(
    private readonly http: HttpClient,
    private readonly sesion: SesionServicio,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (!this.sesion.usuarioEsRol('admin')) {
      void this.router.navigate(['/privado/inicio']);
      return;
    }
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.http.get<RespuestaMantenimiento>('/api/mantenimiento', { headers: this.headers() }).subscribe({
      next: (respuesta) => {
        this.respaldos = respuesta.respaldos;
        this.auditoria = respuesta.auditoria;
        this.programacion = respuesta.programacion;
        this.cargando = false;
      },
      error: (error) => {
        this.error = error?.error?.message ?? 'No se pudo cargar el mantenimiento.';
        this.cargando = false;
      }
    });
  }

  crearRespaldo(): void {
    this.creando = true;
    this.limpiarMensajes();
    this.http.post<{ message: string }>('/api/mantenimiento/respaldos', {}, { headers: this.headers() }).subscribe({
      next: (respuesta) => {
        this.creando = false;
        this.mensaje = respuesta.message;
        this.cargar();
      },
      error: (error) => {
        this.creando = false;
        this.error = error?.error?.message ?? 'No se pudo crear el respaldo.';
      }
    });
  }

  descargar(respaldo: RespaldoBaseDatos): void {
    this.descargando = respaldo.archivo;
    this.limpiarMensajes();
    this.http.get(`/api/mantenimiento/respaldos/${encodeURIComponent(respaldo.archivo)}/descargar`, {
      headers: this.headers(),
      responseType: 'blob'
    }).subscribe({
      next: (archivo) => {
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(archivo);
        enlace.download = respaldo.archivo;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
        this.descargando = '';
        this.mensaje = 'Respaldo descargado de forma segura.';
      },
      error: () => {
        this.descargando = '';
        this.error = 'No se pudo descargar el respaldo.';
      }
    });
  }

  abrirRestauracion(respaldo: RespaldoBaseDatos): void {
    this.accionCritica = 'restaurar';
    this.respaldoSeleccionado = respaldo;
    this.abrirModal();
  }

  abrirReinicio(): void {
    this.accionCritica = 'reiniciar';
    this.respaldoSeleccionado = null;
    this.abrirModal();
  }

  cerrarModal(): void {
    if (this.procesando) {
      return;
    }
    this.modalAbierto = false;
    this.password = '';
    this.confirmacion = '';
  }

  ejecutarAccionCritica(): void {
    const palabra = this.palabraConfirmacion;
    if (!this.password || this.confirmacion.trim().toUpperCase() !== palabra) {
      this.error = `Escribe ${palabra} y tu contrasena para continuar.`;
      return;
    }

    const url = this.accionCritica === 'restaurar' && this.respaldoSeleccionado
      ? `/api/mantenimiento/respaldos/${encodeURIComponent(this.respaldoSeleccionado.archivo)}/restaurar`
      : '/api/mantenimiento/reiniciar';

    this.procesando = true;
    this.limpiarMensajes();
    this.http.post<{ message: string; cerrar_sesion?: boolean }>(url, {
      password: this.password,
      confirmacion: palabra
    }, { headers: this.headers() }).subscribe({
      next: (respuesta) => {
        this.procesando = false;
        this.modalAbierto = false;
        this.mensaje = respuesta.message;
        this.password = '';
        this.confirmacion = '';
        if (respuesta.cerrar_sesion) {
          setTimeout(() => {
            this.sesion.limpiarSesion();
            void this.router.navigate(['/ingresar']);
          }, 1800);
          return;
        }
        this.cargar();
      },
      error: (error) => {
        this.procesando = false;
        this.error = error?.error?.message ?? 'No se pudo completar la operacion.';
      }
    });
  }

  get palabraConfirmacion(): string {
    return this.accionCritica === 'restaurar' ? 'RESTAURAR' : 'REINICIAR';
  }

  get tituloModal(): string {
    return this.accionCritica === 'restaurar' ? 'Restaurar base de datos' : 'Reiniciar datos operativos';
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(fecha));
  }

  etiquetaTipo(tipo: string): string {
    const etiquetas: Record<string, string> = {
      manual: 'Manual',
      diario: 'Diario',
      semanal: 'Semanal',
      mensual: 'Mensual',
      'pre-restauracion': 'Antes de restaurar',
      'pre-reinicio': 'Antes de reiniciar'
    };
    return etiquetas[tipo] ?? tipo;
  }

  etiquetaAccion(accion: string): string {
    return accion.replaceAll('_', ' ');
  }

  private abrirModal(): void {
    this.limpiarMensajes();
    this.password = '';
    this.confirmacion = '';
    this.modalAbierto = true;
  }

  private limpiarMensajes(): void {
    this.mensaje = '';
    this.error = '';
  }

  private headers(): HttpHeaders {
    const token = this.sesion.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
