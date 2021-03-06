import { ComponentRef, ElementRef, EventEmitter, Output, Renderer } from '@angular/core';

import { Footer, Header } from '../components/toolbar/toolbar';
import { isPresent, assert } from '../util/util';
import { Navbar } from '../components/navbar/navbar';
import { NavController } from './nav-controller';
import { NavOptions, ViewState } from './nav-util';
import { NavParams } from './nav-params';
import { Content } from '../components/content/content';


/**
 * @name ViewController
 * @description
 * Access various features and information about the current view.
 * @usage
 *  ```ts
 * import { Component } from '@angular/core';
 * import { ViewController } from 'ionic-angular';
 *
 * @Component({...})
 * export class MyPage{
 *
 *   constructor(public viewCtrl: ViewController) {}
 *
 * }
 * ```
 */
export class ViewController {

  private _cntDir: any;
  private _cntRef: ElementRef;
  private _ionCntDir: Content;
  private _ionCntRef: ElementRef;
  private _hdrDir: Header;
  private _ftrDir: Footer;
  private _isHidden: boolean = false;
  private _leavingOpts: NavOptions;
  private _nb: Navbar;
  private _onDidDismiss: Function;
  private _onWillDismiss: Function;
  private _dismissData: any;
  private _dismissRole: any;
  private _detached: boolean;

  _cmp: ComponentRef<any>;
  _nav: NavController;
  _zIndex: number;
  _state: ViewState = ViewState.NEW;
  _cssClass: string;

  /**
   * Observable to be subscribed to when the current component will become active
   * @returns {Observable} Returns an observable
   */
  willEnter: EventEmitter<any> = new EventEmitter();

  /**
   * Observable to be subscribed to when the current component has become active
   * @returns {Observable} Returns an observable
   */
  didEnter: EventEmitter<any> = new EventEmitter();

  /**
   * Observable to be subscribed to when the current component will no longer be active
   * @returns {Observable} Returns an observable
   */
  willLeave: EventEmitter<any> = new EventEmitter();

  /**
   * Observable to be subscribed to when the current component is no long active
   * @returns {Observable} Returns an observable
   */
  didLeave: EventEmitter<any> = new EventEmitter();

  /**
   * Observable to be subscribed to when the current component has been destroyed
   * @returns {Observable} Returns an observable
   */
  willUnload: EventEmitter<any> = new EventEmitter();

  /**
   * @private
   */
  readReady: EventEmitter<any> = new EventEmitter<any>();

  /**
   * @private
   */
  writeReady: EventEmitter<any> = new EventEmitter<any>();

  /** @private */
  data: any;

  /** @private */
  instance: any;

  /** @private */
  id: string;

  /** @private */
  isOverlay: boolean = false;

  /** @private */
  @Output() private _emitter: EventEmitter<any> = new EventEmitter();

  constructor(public component?: any, data?: any, rootCssClass: string = DEFAULT_CSS_CLASS) {
    // passed in data could be NavParams, but all we care about is its data object
    this.data = (data instanceof NavParams ? data.data : (isPresent(data) ? data : {}));

    this._cssClass = rootCssClass;
  }

  /**
   * @private
   */
  init(componentRef: ComponentRef<any>) {
    this._cmp = componentRef;
    this.instance = this.instance || componentRef.instance;
    this._detached = false;
  }

  _setNav(navCtrl: NavController) {
    this._nav = navCtrl;
  }

  _setInstance(instance: any) {
    this.instance = instance;
  }

  /**
   * @private
   */
  subscribe(generatorOrNext?: any): any {
    return this._emitter.subscribe(generatorOrNext);
  }

  /**
   * @private
   */
  emit(data?: any) {
    this._emitter.emit(data);
  }

  /**
   * Called when the current viewController has be successfully dismissed
   */
  onDidDismiss(callback: Function) {
    this._onDidDismiss = callback;
  }

  /**
   * Called when the current viewController will be dismissed
   */
  onWillDismiss(callback: Function) {
    this._onWillDismiss = callback;
  }

  /**
   * Dismiss the current viewController
   * @param {any} [data] Data that you want to return when the viewController is dismissed.
   * @param {any} [role ]
   * @param {NavOptions} NavOptions Options for the dismiss navigation.
   * @returns {any} data Returns the data passed in, if any.
   */
  dismiss(data?: any, role?: any, navOptions: NavOptions = {}): Promise<any> {
    if (!this._nav) {
      return Promise.resolve(false);
    }
    if (this.isOverlay && !navOptions.minClickBlockDuration) {
      // This is a Modal being dismissed so we need
      // to add the minClickBlockDuration option
      // for UIWebView
      navOptions.minClickBlockDuration = 400;
    }
    this._dismissData = data;
    this._dismissRole = role;

    const options = Object.assign({}, this._leavingOpts, navOptions);
    return this._nav.removeView(this, options).then(() => data);
  }

  /**
   * @private
   */
  getNav(): NavController {
    return this._nav;
  }

  /**
   * @private
   */
  getTransitionName(direction: string): string {
    return this._nav && this._nav.config.get('pageTransition');
  }

  /**
   * @private
   */
  getNavParams(): NavParams {
    return new NavParams(this.data);
  }

  /**
   * @private
   */
  setLeavingOpts(opts: NavOptions) {
    this._leavingOpts = opts;
  }

  /**
   * Check to see if you can go back in the navigation stack.
   * @returns {boolean} Returns if it's possible to go back from this Page.
   */
  enableBack(): boolean {
    // update if it's possible to go back from this nav item
    if (!this._nav) {
      return false;
    }
    // the previous view may exist, but if it's about to be destroyed
    // it shouldn't be able to go back to
    const previousItem = this._nav.getPrevious(this);
    return !!(previousItem);
  }

  /**
   * @private
   */
  get name(): string {
    return (this.component ? this.component.name : '');
  }

  /**
   * Get the index of the current component in the current navigation stack.
   * @returns {number} Returns the index of this page within its `NavController`.
   */
  get index(): number {
    return (this._nav ? this._nav.indexOf(this) : -1);
  }

  /**
   * @returns {boolean} Returns if this Page is the first in the stack of pages within its NavController.
   */
  isFirst(): boolean {
    return (this._nav ? this._nav.first() === this : false);
  }

  /**
   * @returns {boolean} Returns if this Page is the last in the stack of pages within its NavController.
   */
  isLast(): boolean {
    return (this._nav ? this._nav.last() === this : false);
  }

  /**
   * @private
   * DOM WRITE
   */
  _domShow(shouldShow: boolean, renderer: Renderer) {
    // using hidden element attribute to display:none and not render views
    // _hidden value of '' means the hidden attribute will be added
    // _hidden value of null means the hidden attribute will be removed
    // doing checks to make sure we only update the DOM when actually needed
    // if it should render, then the hidden attribute should not be on the element
    if (this._cmp && shouldShow === this._isHidden) {
      this._isHidden = !shouldShow;
      let value = (shouldShow ? null : '');
      // ******** DOM WRITE ****************
      renderer.setElementAttribute(this.pageRef().nativeElement, 'hidden', value);
    }
  }

  /**
   * @private
   */
  getZIndex(): number {
    return this._zIndex;
  }

  /**
   * @private
   * DOM WRITE
   */
  _setZIndex(zIndex: number, renderer: Renderer) {
    if (zIndex !== this._zIndex) {
      this._zIndex = zIndex;
      const pageRef = this.pageRef();
      if (pageRef) {
        // ******** DOM WRITE ****************
        renderer.setElementStyle(pageRef.nativeElement, 'z-index', (<any>zIndex));
      }
    }
  }

  /**
   * @returns {ElementRef} Returns the Page's ElementRef.
   */
  pageRef(): ElementRef {
    return this._cmp && this._cmp.location;
  }

  _setContent(directive: any) {
    this._cntDir = directive;
  }

  /**
   * @returns {component} Returns the Page's Content component reference.
   */
  getContent(): any {
    return this._cntDir;
  }

  _setContentRef(elementRef: ElementRef) {
    this._cntRef = elementRef;
  }

  /**
   * @returns {ElementRef} Returns the Content's ElementRef.
   */
  contentRef(): ElementRef {
    return this._cntRef;
  }

  _setIONContent(content: Content) {
    this._setContent(content);
    this._ionCntDir = content;
  }

  /**
   * @private
   */
  getIONContent(): Content {
    return this._ionCntDir;
  }

  _setIONContentRef(elementRef: ElementRef) {
    this._setContentRef(elementRef);
    this._ionCntRef = elementRef;
  }

  /**
   * @private
   */
  getIONContentRef(): ElementRef {
    return this._ionCntRef;
  }

  _setHeader(directive: Header) {
    this._hdrDir = directive;
  }

  /**
   * @private
   */
  getHeader(): Header {
    return this._hdrDir;
  }

  _setFooter(directive: Footer) {
    this._ftrDir = directive;
  }

  /**
   * @private
   */
  getFooter(): Footer {
    return this._ftrDir;
  }

  _setNavbar(directive: Navbar) {
    this._nb = directive;
  }

  /**
   * @private
   */
  getNavbar(): Navbar {
    return this._nb;
  }

  /**
   * Find out if the current component has a NavBar or not. Be sure
   * to wrap this in an `ionViewWillEnter` method in order to make sure
   * the view has rendered fully.
   * @returns {boolean} Returns a boolean if this Page has a navbar or not.
   */
  hasNavbar(): boolean {
    return !!this._nb;
  }

  /**
   * Change the title of the back-button. Be sure to call this
   * after `ionViewWillEnter` to make sure the  DOM has been rendered.
   * @param {string} backButtonText Set the back button text.
   */
  setBackButtonText(val: string) {
    this._nb && this._nb.setBackButtonText(val);
  }

  /**
   * Set if the back button for the current view is visible or not. Be sure to call this
   * after `ionViewWillEnter` to make sure the  DOM has been rendered.
   * @param {boolean} Set if this Page's back button should show or not.
   */
  showBackButton(shouldShow: boolean) {
    if (this._nb) {
      this._nb.hideBackButton = !shouldShow;
    }
  }

  _preLoad() {
    assert(this._state === ViewState.INITIALIZED, 'view state must be INITIALIZED');
    this._lifecycle('PreLoad');
  }

  /**
   * @private
   * The view has loaded. This event only happens once per view will be created.
   * This event is fired before the component and his children have been initialized.
   */
  _willLoad() {
    assert(this._state === ViewState.INITIALIZED, 'view state must be INITIALIZED');
    this._lifecycle('WillLoad');
  }

  /**
   * @private
   * The view has loaded. This event only happens once per view being
   * created. If a view leaves but is cached, then this will not
   * fire again on a subsequent viewing. This method is a good place
   * to put your setup code for the view; however, it is not the
   * recommended method to use when a view becomes active.
   */
  _didLoad() {
    assert(this._state === ViewState.ATTACHED, 'view state must be ATTACHED');
    this._lifecycle('DidLoad');
  }

  /**
   * @private
   * The view is about to enter and become the active view.
   */
  _willEnter() {
    assert(this._state === ViewState.ATTACHED, 'view state must be ATTACHED');

    if (this._detached && this._cmp) {
      // ensure this has been re-attached to the change detector
      this._cmp.changeDetectorRef.reattach();
      this._detached = false;
    }

    this.willEnter.emit(null);
    this._lifecycle('WillEnter');
  }

  /**
   * @private
   * The view has fully entered and is now the active view. This
   * will fire, whether it was the first load or loaded from the cache.
   */
  _didEnter() {
    assert(this._state === ViewState.ATTACHED, 'view state must be ATTACHED');

    this._nb && this._nb.didEnter();
    this.didEnter.emit(null);
    this._lifecycle('DidEnter');
  }

  /**
   * @private
   * The view is about to leave and no longer be the active view.
   */
  _willLeave(willUnload: boolean) {
    this.willLeave.emit(null);
    this._lifecycle('WillLeave');

    if (willUnload && this._onWillDismiss) {
      this._onWillDismiss(this._dismissData, this._dismissRole);
      this._onWillDismiss = null;
    }
  }

  /**
   * @private
   * The view has finished leaving and is no longer the active view. This
   * will fire, whether it is cached or unloaded.
   */
  _didLeave() {
    this.didLeave.emit(null);
    this._lifecycle('DidLeave');

    // when this is not the active page
    // we no longer need to detect changes
    if (!this._detached && this._cmp) {
      this._cmp.changeDetectorRef.detach();
      this._detached = true;
    }
  }

  /**
   * @private
   */
  _willUnload() {
    this.willUnload.emit(null);
    this._lifecycle('WillUnload');

    this._onDidDismiss && this._onDidDismiss(this._dismissData, this._dismissRole);
    this._onDidDismiss = null;
    this._dismissData = null;
    this._dismissRole = null;
  }

  /**
   * @private
   * DOM WRITE
   */
  _destroy(renderer: Renderer) {
    assert(this._state !== ViewState.DESTROYED, 'view state must be ATTACHED');

    if (this._cmp) {
      if (renderer) {
        // ensure the element is cleaned up for when the view pool reuses this element
        // ******** DOM WRITE ****************
        var cmpEle = this._cmp.location.nativeElement;
        renderer.setElementAttribute(cmpEle, 'class', null);
        renderer.setElementAttribute(cmpEle, 'style', null);
      }

      // completely destroy this component. boom.
      this._cmp.destroy();
    }

    this._nav = this._cmp = this.instance = this._cntDir = this._cntRef = this._leavingOpts = this._hdrDir = this._ftrDir = this._nb = this._onDidDismiss = this._onWillDismiss = null;
    this._state = ViewState.DESTROYED;
  }

  /**
   * @private
   */
  _lifecycleTest(lifecycle: string): boolean | Promise<any> {
    const instance = this.instance;
    const methodName = 'ionViewCan' + lifecycle;
    if (instance && instance[methodName]) {
      try {
        var result = instance[methodName]();
        if (result === false) {
          return false;
        } else if (result instanceof Promise) {
          return result;
        } else {
          return true;
        }

      } catch (e) {
        console.error(`${this.name} ${methodName} error: ${e.message}`);
        return false;
      }
    }
    return true;
  }

  _lifecycle(lifecycle: string) {
    const instance = this.instance;
    const methodName = 'ionView' + lifecycle;
    if (instance && instance[methodName]) {
      try {
        instance[methodName]();

      } catch (e) {
        console.error(`${this.name} ${methodName} error: ${e.message}`);
      }
    }
  }

}

export function isViewController(viewCtrl: any): boolean {
  return !!(viewCtrl && (<ViewController>viewCtrl)._didLoad && (<ViewController>viewCtrl)._willUnload);
}

const DEFAULT_CSS_CLASS = 'ion-page';
