import {Directive, OnInit, Renderer, Input, ElementRef} from '@angular/core';

@Directive({
  selector: '[widget]'
})
export class Widget implements OnInit {
  @Input() public size: number[] = [1, 1];

  constructor(private _ngEl: ElementRef,
              private _renderer: Renderer) {
  }

  ngOnInit(): void {
    this._renderer.setElementClass(this._ngEl.nativeElement, 'widget', true);
  }

  public get offset() {
    return this._ngEl.nativeElement.getBoundingClientRect();
  }

  public get width() {
    return this._ngEl.nativeElement.offsetWidth;
  }

  public get height() {
    return this._ngEl.nativeElement.offsetHeight;
  }

  public set height(height) {
    this._renderer.setElementStyle(this._ngEl.nativeElement, 'height', height + 'px');
  }

  public set width(width) {
    this._renderer.setElementStyle(this._ngEl.nativeElement, 'width', width + 'px');
  }

  public setPosition(top: number, left: number): void {
    console.log('setPosition', top, left);
    this._renderer.setElementStyle(this._ngEl.nativeElement, 'top', top + 'px');
    this._renderer.setElementStyle(this._ngEl.nativeElement, 'left', left + 'px');
  }

  public setEventListener(handle: string, cbMouse: Function, cbTouch: Function): void {
    if (handle) {

    }
    else {
      this._renderer.listen(this._ngEl.nativeElement, 'mousedown', (e) => cbMouse(e, this));
      this._renderer.listen(this._ngEl.nativeElement, 'touchstart', (e) => cbTouch(e, this));
    }
  }

  addClass(myClass: string) {
    this._renderer.setElementClass(this._ngEl.nativeElement, myClass, true);
  }

  removeClass(myClass: string) {
    this._renderer.setElementClass(this._ngEl.nativeElement, myClass, false);
  }
}