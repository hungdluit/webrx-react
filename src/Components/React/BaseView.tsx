'use strict';

import * as React from 'react';
import * as Rx from 'rx';
import * as wx from 'webrx';

import logManager from '../Common/App/Logging';
import { IBaseViewModel } from './BaseViewModel';

export interface IBaseViewProps {
  key?: string | number;
  viewModel: IBaseViewModel;
}

export abstract class BaseView<TViewProps extends IBaseViewProps, TViewModel extends IBaseViewModel> extends React.Component<TViewProps, TViewModel> {
  public static displayName = 'BaseView';

  private updateSubscription: Rx.IDisposable;

  protected logger = logManager.getLogger(this.getDisplayName());

  constructor(props?: TViewProps, context?: any) {
    super(props, context);

    this.state = props.viewModel as TViewModel;
  }

  protected updateOn(): Rx.Observable<any>[] { return []; }

  protected getDisplayName() { return Object.getName(this); }
  protected getRateLimit() { return 100; }

  protected renderView() { this.forceUpdate(); }

  protected initialize() {}
  protected cleanup() {}

  public bindText(propertySelector: (viewModel: TViewModel) => wx.IObservableProperty<string>) {
    return (x: any) => {
      let value = (x.target as React.HTMLAttributes).value;
      propertySelector(this.state)(value as string);
      this.forceUpdate();
    }
  }

  public bindObservable<TResult>(commandSelector: (viewModel: TViewModel) => wx.ICommand<TResult>, observable: Rx.Observable<TResult>) {
    return this.state.bind(observable, commandSelector(this.state));
  }

  public bindCallback<TEvent, TParameter>(
    targetSelector: (viewModel: TViewModel) => wx.IObservableProperty<TParameter>,
    paramSelector: (event: TEvent, ...args: any[]) => TParameter
  ) : (event: TEvent) => void {
    return (event: TEvent, ...args: any[]) => targetSelector(this.state)(paramSelector(event, args));
  }

  public bindEvent<TEvent, TParameter>(
    commandSelector: (viewModel: TViewModel) => wx.ICommand<any>,
    eventArgsSelector?: (e: TEvent, args: any[]) => TParameter,
    conditionSelector?: (e: TEvent, x: TParameter) => boolean
  ): (event: TEvent) => void {
    return (e: TEvent, ...args: any[]) => {
      let parameter = eventArgsSelector ? eventArgsSelector(e, args) : null;
      if (conditionSelector == null || conditionSelector(e, parameter) === true) {
        let cmd = commandSelector(this.state);
        if (cmd.canExecute(parameter)) {
          cmd.execute(parameter);
        }
      }
    };
  }

  private logRender(initial: boolean) {
    this.logger.debug('{0}rendering', initial ? '' : 're-');
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

  componentWillMount() {
    this.state.initialize();
    this.initialize();

    this.subscribeToUpdates();

    this.logRender(true);
  }

  componentWillReceiveProps(nextProps: TViewProps, nextContext: any) {
    let state = nextProps.viewModel;

    if (state != this.state) {
      this.logger.debug('ViewModel Change Detected');

      // cleanup old view model
      this.state.cleanup();
      this.updateSubscription = Object.dispose(this.updateSubscription);

      // set our new view model as the current state and initialize it
      this.state = state as TViewModel;
      this.state.initialize();
      this.subscribeToUpdates();

      this.forceUpdate();
    }
  }

  componentWillUpdate(nextProps: TViewProps, nextState: TViewModel, nextContext: any) {
    this.logRender(false);
  }

  componentWillUnmount() {
    this.cleanup();
    this.state.cleanup();

    this.updateSubscription = Object.dispose(this.updateSubscription);
  }
}

export default BaseView;
