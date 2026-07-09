import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SelectBonitoDirective } from './select-bonito.directive';

@Component({
  standalone: true,
  imports: [FormsModule, SelectBonitoDirective],
  template: `
    <select [(ngModel)]="valor">
      <option value="factura">Factura</option>
      <option value="boleta">Boleta</option>
    </select>
  `
})
class ComponentePrueba {
  valor = 'factura';
}

describe('SelectBonitoDirective', () => {
  let fixture: ComponentFixture<ComponentePrueba>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ComponentePrueba] }).compileComponents();
    fixture = TestBed.createComponent(ComponentePrueba);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.querySelectorAll('.select-bonito__menu').forEach((menu) => menu.remove());
  });

  it('muestra las opciones y conserva el enlace con ngModel', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('.select-bonito__trigger') as HTMLButtonElement;
    expect(trigger.textContent?.trim()).toBe('Factura');

    trigger.click();
    const opciones = Array.from(document.querySelectorAll<HTMLButtonElement>('.select-bonito__opcion'));
    expect(opciones.length).toBe(2);
    opciones[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.valor).toBe('boleta');
    expect(trigger.textContent?.trim()).toBe('Boleta');
  }));

  it('refleja cambios realizados desde el componente', fakeAsync(() => {
    tick();
    fixture.componentInstance.valor = 'boleta';
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('.select-bonito__trigger') as HTMLButtonElement;
    expect(trigger.textContent?.trim()).toBe('Boleta');
  }));
});
