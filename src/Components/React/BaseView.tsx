import * as React from 'react';
import * as Rx from 'rx';
import * as wx from 'webrx';

import { getLogger } from '../../Utils/Logging/LogManager';
import { BaseViewModel, LifecycleComponentViewModel } from './BaseViewModel';
import { Loading } from '../Common/Loading/Loading';

export interface IBaseViewProps extends React.HTMLAttributes {
  viewModel: BaseViewModel;
}

export abstract class BaseView<TViewProps extends IBaseViewProps, TViewModel extends BaseViewModel> extends React.Component<TViewProps, TViewModel> {
  public static displayName = 'BaseView';

  private updateSubscription: Rx.IDisposable;

  protected logger = getLogger(this.getDisplayName());

  constructor(props?: TViewProps, context?: any) {
    super(props, context);

    this.state = props.viewModel as TViewModel;
  }

  private logRender(initial: boolean) {
    this.logger.debug(`${initial ? '' : 're-'}rendering`);
  }

  private subscribeToUpdates() {
    let updateProps = this.updateOn();
    updateProps.push(this.state.stateChanged.results);

    this.updateSubscription = Rx.Observable
      .fromArray(updateProps)
      .selectMany(x => x)
      .debounce(this.getRateLimit())
      .subscribe(x => {
        this.renderView();
      }, x => {
        this.state.alertForError(x);
      });
  }

  // -----------------------------------------
  // these are react lifecycle functions
  // -----------------------------------------
  componentWillMount() {
    this.initializeView();

    this.subscribeToUpdates();

    this.logRender(true);
  }

  componentDidMount() {
    this.loadedView();
  }

  componentWillReceiveProps(nextProps: TViewProps, nextContext: any) {
    let state = nextProps.viewModel;

    // TODO: need to find a better way to handle this case...
    if (state !== this.state) {
      this.logger.debug('ViewModel Change Detected');

      // cleanup old view model
      (this.state as any as LifecycleComponentViewModel).cleanupViewModel();
      this.updateSubscription = Object.dispose(this.updateSubscription);

      // set our new view model as the current state and initialize it
      this.state = state as TViewModel;
      (this.state as any as LifecycleComponentViewModel).initializeViewModel();
      this.subscribeToUpdates();

      this.forceUpdate();

      (this.state as any as LifecycleComponentViewModel).loadedViewModel();
    }
  }

  componentWillUpdate(nextProps: TViewProps, nextState: TViewModel, nextContext: any) {
    this.logRender(false);
  }

  componentDidUpdate(prevProps: TViewProps, nextstate: TViewModel) {
    this.updatedView();
  }

  componentWillUnmount() {
    this.cleanupView();

    this.updateSubscription = Object.dispose(this.updateSubscription);
  }
  // -----------------------------------------

  // -----------------------------------------
  // these are internal lifecycle functions
  // -----------------------------------------
  private initializeView() {
    (this.state as any as LifecycleComponentViewModel).initializeViewModel();
    this.initialize();
  }

  private loadedView() {
    this.loaded();
    (this.state as any as LifecycleComponentViewModel).loadedViewModel();
  }

  private updatedView() {
    this.updated();
    (this.state as any as LifecycleComponentViewModel).updatedViewModel();
  }

  private cleanupView() {
    this.cleanup();
    (this.state as any as LifecycleComponentViewModel).cleanupViewModel();
  }
  // -----------------------------------------

  // -----------------------------------------
  // these are overridable lifecycle functions
  // -----------------------------------------
  protected initialize() {
    // do nothing by default
  }

  protected loaded() {
    // do nothing by default
  }

  protected updated() {
    // do nothing by default
  }

  protected cleanup() {
    // do nothing by default
  }
  // -----------------------------------------

  // -----------------------------------------
  // these are the property destruction helpers
  // these functions will remove key, ref, and viewModel props automatically
  // -----------------------------------------

  // this helper breaks up the props into two groups, included and excluded
  // i.e., const [ props, childProps ] = this.destruct('someProp', 'anotherProp');
  protected destruct(...propNames: string[]) {
    return Object.destruct(Object.omit(this.props, 'key', 'ref', 'viewModel'), ...propNames);
  }

  // this helper breaks up the props into individual values, along with a rest prop
  // i.e., const [ someProp, anotherProp, childProps ] = this.destructProps('someProp', 'anotherProp');
  protected destructProps(...propNames: string[]) {
    return Object.destructProps(Object.omit(this.props, 'key', 'ref', 'viewModel'), ...propNames);
  }
  // -----------------------------------------

  // -----------------------------------------
  // these overridable view functions
  // -----------------------------------------
  protected updateOn(): Rx.Observable<any>[] { return []; }

  protected getDisplayName() { return Object.getName(this); }
  protected getRateLimit() { return 100; }

  protected renderView() { this.forceUpdate(); }
  // -----------------------------------------

  // -----------------------------------------
  // these are render helper methods
  // -----------------------------------------
  protected renderSizedLoadable(
    isLoading: wx.IObservableProperty<boolean> | boolean,
    text: string,
    fontSize: number | string,
    loadedComponent?: any
  ) {
    return this.renderLoadable(isLoading, {
      text,
      fontSize,
    }, loadedComponent);
  }

  protected renderLoadable(
    isLoading: wx.IObservableProperty<boolean> | boolean,
    loadingComponent: any,
    loadedComponent?: any
  ) {
    const defaultProps = {
      fluid: true,
      indeterminate: true,
    };
    const loadingComponentType = typeof loadingComponent;

    if (loadingComponentType === 'string') {
      loadingComponent = (
        <Loading {...defaultProps} text={loadingComponent} />
      );
    }
    else if (loadingComponentType === 'object') {
      if (React.isValidElement(loadingComponent) === false) {
        loadingComponent = (
          <Loading {...defaultProps} {...loadingComponent} />
        );
      }
    }

    return this.renderConditional(isLoading, loadingComponent, loadedComponent);
  }

  protected renderConditional(
    condition: wx.IObservableProperty<boolean> | boolean,
    trueContent: any,
    falseContent?: any
  ) {
    return (condition instanceof Function ? condition() : condition) === true ?
      (trueContent instanceof Function ? trueContent.apply(this) : trueContent) :
      (falseContent instanceof Function ? falseContent.apply(this) : falseContent);
  }

  protected renderEnumerable<T, TResult>(
    source: T[] | Ix.Enumerable<T>,
    selector: (data: T[]) => TResult = (data) => data as any as TResult,
    defaultSelector: () => TResult = () => null as TResult
  ) {
    const array = (source instanceof Array) ? source : source.toArray();

    return array.length > 0 ? selector(array) : defaultSelector();
  }
  // -----------------------------------------

  /**
   * Binds an observable to a command on the view model
   */
  public bindObservableToCommand<TResult>(commandSelector: (viewModel: TViewModel) => wx.ICommand<TResult>, observable: Rx.Observable<TResult>) {
    return this.state.bind(observable, commandSelector(this.state));
  }

  /**
   * Binds a DOM event to an observable property on the view model
   */
  public bindEventToProperty<TValue, TEvent extends Event | React.SyntheticEvent>(
    targetSelector: (viewModel: TViewModel) => wx.IObservableProperty<TValue>,
    valueSelector?: (eventKey: any, event: TEvent) => TValue
  ) {
    return (eventKey: any, event: TEvent) => {
      if (event == null) {
        // this ensures that we can still use this function for basic HTML events
        event = eventKey;
      }

      const prop = targetSelector.apply(this, [ this.state ]) as wx.IObservableProperty<TValue>;
      const value = (valueSelector == null ? eventKey : valueSelector.apply(this, [ eventKey, event ])) as TValue;

      prop(value);
    };
  }

  /**
   * Binds a DOM event to an observable command on the view model
   */
  public bindEventToCommand<TParameter, TEvent extends Event | React.SyntheticEvent>(
    commandSelector: (viewModel: TViewModel) => wx.ICommand<any>,
    paramSelector?: (eventKey: any, event: TEvent) => TParameter,
    conditionSelector?: (event: TEvent, eventKey: any) => boolean
  ) {
    return (eventKey: any, event: Event) => {
      if (event == null) {
        // this ensures that we can still use this function for basic HTML events
        event = eventKey;
      }

      const param = (paramSelector == null ? eventKey : paramSelector.apply(this, [ eventKey, event ])) as TParameter;
      const canExecute = conditionSelector == null || (conditionSelector.apply(this, [ event, eventKey ]) as boolean);

      if (canExecute) {
        const cmd = commandSelector.apply(this, [ this.state ]) as wx.ICommand<any>;

        cmd.execute(param);
      }
    };
  }
}
