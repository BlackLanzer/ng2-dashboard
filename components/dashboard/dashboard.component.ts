import {
  EventEmitter,
  ContentChildren,
  Component,
  Input,
  Output,
  AfterViewInit,
  Renderer,
  ElementRef,
  QueryList,
  ViewContainerRef,
  ComponentFactoryResolver, ViewChild, OnChanges, SimpleChanges
} from "@angular/core";
import {WidgetComponent} from "../widget/widget.component";

@Component({
  selector: 'dashboard',
  template: '<div #target><ng-content></ng-content></div>',
  host: {
    '(window:resize)': '_onResize($event)',
    '(document:mousemove)': '_onMouseMove($event)',
    '(document:mouseup)': '_onMouseUp($event)',
    '(document:touchmove)': '_onMouseMove($event)',
    '(document:touchend)': '_onMouseUp($event)',
    '(document:touchcancel)': '_onMouseUp($event)'
  },
  styles: [require('./dashboard.component.css')]
})
export class DashboardComponent implements AfterViewInit, OnChanges {
//	Event Emitters
  @Output() public onDragStart: EventEmitter<WidgetComponent> = new EventEmitter<WidgetComponent>();
  @Output() public onDrag: EventEmitter<WidgetComponent> = new EventEmitter<WidgetComponent>();
  @Output() public onDragEnd: EventEmitter<WidgetComponent> = new EventEmitter<WidgetComponent>();

  @Input() margin: number = 10;
  @Input() handle: string;
  @Input() widgetsSize: number[] = [300, 300];

  //	Public variables
  public dragEnable: boolean = true;
  @ViewChild('target', {read: ViewContainerRef}) _viewCntRef;

  //	Private variables
  private _width: number = 0;
  private _nbColumn: number = 0;
  private _columnTops: number[] = [];
  private _isDragging: boolean = false;
  private _currentElement: WidgetComponent;
  private _elements: WidgetComponent[] = [];
  private _offset: any;

  @ContentChildren(WidgetComponent) _items: QueryList<WidgetComponent>;

  constructor(private _componentFactoryResolver: ComponentFactoryResolver,
              private _ngEl: ElementRef,
              private _renderer: Renderer) {

  }

  ngOnChanges(changes: SimpleChanges): void {
    // changes.prop contains the old and the new value...
    this._calculSizeAndColumn();
    this._calculPositions();
  }

  ngAfterViewInit(): void {
    this._items.forEach(item => {
      item.setEventListener(this.handle, this._onMouseDown.bind(this));
      this._elements.push(item);
    });
    this._calculSizeAndColumn();
    this._offset = {
      top: this._ngEl.nativeElement.offsetY || this._ngEl.nativeElement.offsetTop,
      left: this._ngEl.nativeElement.offsetX || this._ngEl.nativeElement.offsetLeft
    };
    this._calculPositions();
  }

  public enableDrag(): void {
    this.dragEnable = true;
  }

  public disableDrag(): void {
    this.dragEnable = false;
  }

  public addItem(ngItem: { new(): WidgetComponent}): void {
    let factory = this._componentFactoryResolver.resolveComponentFactory(ngItem);
    const ref = this._viewCntRef.createComponent(factory);
    ref.instance.setEventListener(this.handle, this._onMouseDown.bind(this));
    this._elements.push(ref.instance);
    this._calculPositions();
  }

  public removeItem(ngItem: WidgetComponent): void {
    this._removeElement(ngItem);
  }

  public removeItemByIndex(index: Number): void {
    const element = this._elements.find((item, i) => i === index);
    this._removeElement(element);
  }

  public removeItemById(id: string): void {
    const element = this._elements.find(item => item.widgetId === id);
    this._removeElement(element);
  }

  private _removeElement(widget: WidgetComponent) {
    this._enableAnimation();
    widget.removeFromParent();
    this._elements = this._elements.filter((item, i) => item !== widget);
    this._calculPositions();
    this._disableAnimation();
  }

  private _calculPositions(): void {
    let top = 0;
    let left = this.margin;

    this._columnTops = [];
    let columnIndex = 0;
    let rowIndex = 0;

    const grid = [];

    let items = this._elements;

    for (let i = 0; i < items.length; i++) {
      let item = items[i];

      if (!grid[columnIndex]) {
        grid[columnIndex] = [];
      }

      item.width = this.widgetsSize[0] * item.size[0] + (item.size[0] - 1) * this.margin;
      item.height = this.widgetsSize[1] * item.size[1] + (item.size[1] - 1) * this.margin;

      if (columnIndex >= this._nbColumn) {
        columnIndex = 0;
      }

      if (!this._columnTops[columnIndex]) this._columnTops[columnIndex] = 0;

      if ((left + item.width + this.margin) > this._width) {
        left = this.margin;
        rowIndex++;
        if (columnIndex < this._nbColumn) {
          columnIndex++;
        }
      }
      top = this._columnTops[columnIndex] + this.margin;

      item.setPosition(top, left);
      console.log(this._columnTops, columnIndex, rowIndex);
      left += item.width + this.margin;

      this._columnTops[columnIndex] += top + item.height;
      columnIndex++;
    }
  }

  private _calculSizeAndColumn(): void {
    this._width = this._ngEl.nativeElement.offsetWidth;
    this._nbColumn = Math.floor(this._width / (this.widgetsSize[0] + this.margin));
  }

  private _onResize(e: any): void {
    this._calculSizeAndColumn();
    this._calculPositions();
  }

  private _onMouseDown(e: any, widget: WidgetComponent): boolean {
    this._isDragging = this.dragEnable && e.target === widget.el;
    console.log('_onMouseDown');
    if (this._isDragging) {
      this.onDragStart.emit(widget);
      widget.addClass('active');
      this._currentElement = widget;
      this._offset = this._getOffsetFromTarget(e);
      this._enableAnimation();

      if (this._isTouchEvent(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    return true;
  }

  private _onMouseMove(e: any): boolean {
    if (this._isDragging) {
      this.onDrag.emit(this._currentElement);
      const pos = this._getMousePosition(e);
      let left = pos.left - this._offset.left;
      let top = pos.top - this._offset.top;

      this._elements.sort(this._compare);
      this._calculPositions();
      this._currentElement.setPosition(top, left);

      if (this._isTouchEvent(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    return true;
  }

  private _onMouseUp(e: any): boolean {
    if (this._isDragging) {
      this._isDragging = false;
      if (this._currentElement) {
        this.onDragEnd.emit(this._currentElement);
        this._currentElement.removeClass('active');
        this._currentElement.addClass('animate');
      }
      this._currentElement = null;
      this._offset = null;
      this._calculPositions();
      this._disableAnimation();
      if (this._isTouchEvent(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    return true;
  }

  private _manageEvent(e: any): any {
    if (this._isTouchEvent(e)) {
      e = e.touches.length > 0 ? e.touches[0] : e.changedTouches[0];
    }
    return e;
  }

  private _isTouchEvent(e: any): any {
    return ((<any>window).TouchEvent && e instanceof TouchEvent) || (e.touches || e.changedTouches);
  }

  private _getOffsetFromTarget(e: any) {
    let x;
    let y;
    if (this._isTouchEvent(e)) {
      e = e.touches.length > 0 ? e.touches[0] : e.changedTouches[0];
      x = e.pageX - e.target.offsetLeft;
      y = e.pageY - e.target.offsetTop;
    }
    else {
      x = e.offsetX || e.offsetLeft;
      y = e.offsetY || e.offsetTop;
    }

    return {top: y, left: x};
  }

  private _getMousePosition(e: any): any {
    e = this._manageEvent(e);
    const refPos: any = this._ngEl.nativeElement.getBoundingClientRect();

    let left: number = e.clientX - refPos.left;
    let top: number = e.clientY - refPos.top;
    return {
      left: left,
      top: top
    };
  }

  private _getAbsoluteMousePosition(e: any): any {
    e = this._manageEvent(e);

    return {
      left: e.clientX,
      top: e.clientY
    };
  }

  private _compare = function (widget1, widget2) {
    if (widget1.offset.top > widget2.offset.top + widget2.height) {
      return +1;
    }
    if (widget2.offset.top > widget1.offset.top + widget1.height) {
      return -1;
    }
    if ((widget1.offset.left + (widget1.width / 2)) > (widget2.offset.left + (widget2.width / 2))) {
      return +1;
    }
    if ((widget2.offset.left + (widget2.width / 2)) > (widget1.offset.left + (widget1.width / 2))) {
      return -1;
    }
    return 0;
  };

  private _enableAnimation() {
    this._elements.forEach(item => {
      if (item != this._currentElement) {
        item.addClass('animate');
      }
    });
  }

  private _disableAnimation() {
    setTimeout(() => {
      this._elements.forEach(item => {
        item.removeClass('animate');
      });
    }, 500);
  }
}
