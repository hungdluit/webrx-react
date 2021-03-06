import { Observable } from 'rx';
import * as wx from 'webrx';

import { Route } from '../../Routing/RouteManager';
import { HeaderCommandAction, HeaderMenu } from '../React/Actions';
import { BaseRoutableViewModel } from '../React/BaseRoutableViewModel';
import { PageHeaderViewModel } from '../Common/PageHeader/PageHeaderViewModel';
import { Current as App } from '../Common/App/AppViewModel';
import { RouteMap, ViewModelActivator } from './RoutingMap';
import { RouteMap as AppRouteMap } from '../../Routing/RoutingMap';

// inject the demo infrastructure into the app routing and view maps
AppRouteMap['/'] = { path: '/demo' };
// setup the demo route path pattern
AppRouteMap['^/demo(/(.*))?'] = { path: '/demo', creator: () => new ComponentDemoViewModel() };

export interface ComponentDemoRoutingState {
  route: Route;
  componentRoute: string;
  columns: number;
}

export class ComponentDemoViewModel extends BaseRoutableViewModel<ComponentDemoRoutingState> {
  public static displayName = 'ComponentDemoViewModel';

  private pageHeader: PageHeaderViewModel;
  private demoAlertItem: HeaderCommandAction;

  public componentRoute: wx.IObservableProperty<string>;
  public columns: wx.IObservableProperty<number>;
  public component: wx.IObservableReadOnlyProperty<any>;

  public setColumns: wx.ICommand<number>;
  public reRender: wx.ICommand<any>;
  private demoAlert: wx.ICommand<any>;

  constructor() {
    super(true);

    this.componentRoute = wx.property<string>();
    this.columns = wx.property(12);

    this.reRender = wx.command();
    this.demoAlert = wx.command((x: string) => this.createAlert(x, 'Demo Alert'), Observable.of(true));

    this.demoAlertItem = {
      id: 'demo-alert-item',
      header: 'Generate Alert',
      command: this.demoAlert,
      visibleWhenDisabled: true,
      iconName: 'flask',
    };

    this.component = wx
      .whenAny(this.routingState, this.reRender.results.startWith(null), x => x)
      .map(x => this.getViewModel(x))
      .toProperty();

    this.subscribe(wx
      .whenAny(this.columns.changed, x => null)
      .invokeCommand(this.routingStateChanged)
    );

    this.subscribe(wx
      .whenAny(this.component, x => x)
      .subscribe(x => {
        if (this.pageHeader != null) {
          this.pageHeader.updateDynamicContent();
        }
      })
    );
  }

  private getComponentRoute(state: ComponentDemoRoutingState) {
    return state == null ? null : (state.route.match[2] || this.componentRoute());
  }

  private getViewModel(state: ComponentDemoRoutingState) {
    let activator: ViewModelActivator = null;

    const componentRoute = this.getComponentRoute(state);

    if (componentRoute != null) {
      this.logger.debug(`Loading View Model for "${ componentRoute }"...`);

      activator = RouteMap.viewModelMap[componentRoute];

      if (activator == null) {
        let result = Object.keys(RouteMap.viewModelMap)
          .filter(x => x != null && x.length > 0 && x[0] === '^')
          .map(x => ({ path: x, regex: new RegExp(x, 'i') }))
          .map(x => ({ path: x.path, match: x.regex.exec(componentRoute) }))
          .filter(x => x.match != null)
          .map(x => ({ path: x.path, match: x.match, activator: RouteMap.viewModelMap[x.path] }))
          .asEnumerable()
          .firstOrDefault();

        if (result != null) {
          activator = result.activator;

          // override the routed state's match with the demo's context
          state.route.match = result.match;
        }
      }
    }

    const viewModel: BaseRoutableViewModel<any> = activator == null ? null : activator(state);

    if (viewModel != null) {
      this.logger.debug(`Loaded View Model "${ Object.getName(viewModel) }"`, viewModel);

      if (viewModel.setRoutingState != null) {
        viewModel.setRoutingState(state);
      }
    }

    return viewModel;
  }

  routed() {
    this.pageHeader = App.header;
  }

  saveRoutingState(state: ComponentDemoRoutingState): any {
    state.route = <Route>{
      path: `/demo/${ this.componentRoute() }`,
    };

    if (this.columns() !== 12) {
      state.columns = this.columns();
    }
  }

  loadRoutingState(state: ComponentDemoRoutingState) {
    const componentRoute = this.getComponentRoute(state);

    if (String.isNullOrEmpty(componentRoute) === true) {
      const uri = RouteMap.menus
        .asEnumerable()
        .selectMany(x => x.items.asEnumerable().map(y => y.uri))
        .filter(x => String.isNullOrEmpty(x) === false)
        .firstOrDefault();

      if (String.isNullOrEmpty(uri) === false) {
        this.navTo(uri);
      }
    }
    else {
      this.componentRoute(componentRoute);
      this.columns(state.columns == null ? 12 : state.columns);
    }
  }

  getSearch() {
    let viewModel = <BaseRoutableViewModel<any>>this.component();

    return (viewModel != null && viewModel.getSearch != null) ? viewModel.getSearch() : null;
  }

  getSidebarMenus() {
    return <HeaderMenu[]>[
      {
        id: 'sidebar-1',
        header: 'Section 1',
        items: [
          Object.assign<HeaderCommandAction>({}, this.demoAlertItem, { id: `${ this.demoAlertItem.id }-sidebar-1`, commandParameter: 'Sidebar Section 1 Menu Item' }),
        ],
      },
      {
        id: 'sidebar-2',
        header: 'Section 2',
        items: [
          Object.assign<HeaderCommandAction>({}, this.demoAlertItem, { id: `${ this.demoAlertItem.id }-sidebar-2-1`, commandParameter: 'Sidebar Section 2 Menu Item 1' }),
          Object.assign<HeaderCommandAction>({}, this.demoAlertItem, { id: `${ this.demoAlertItem.id }-sidebar-2-2`, commandParameter: 'Sidebar Section 2 Menu Item 2' }),
        ],
      },
    ];
  }

  getNavbarMenus() {
    return RouteMap.menus
      .concat(<HeaderMenu>{
        id: `${ this.demoAlertItem.id }-menu`,
        header: 'Sample Routed Menu',
        order: -1,
        items: [
          Object.assign<HeaderCommandAction>({}, this.demoAlertItem, { id: `${ this.demoAlertItem.id }-menuitem`, commandParameter: 'Routed Menu Item' }),
        ],
      });
  }

  getNavbarActions() {
    return <HeaderCommandAction[]>[
      { id: 'reRender', header: 'Re-Render', command: this.reRender, bsStyle: 'primary' },
      Object.assign<HeaderCommandAction>({}, this.demoAlertItem, { id: `${ this.demoAlertItem.id }-navbar`, commandParameter: 'Navbar Action' }),
    ];
  }

  getHelpMenuItems() {
    return <HeaderCommandAction[]>[
      Object.assign<HeaderCommandAction>({}, this.demoAlertItem, { id: `${ this.demoAlertItem.id }-help`, commandParameter: 'Help Menu Item' }),
    ];
  }

  getAdminMenuItems() {
    return <HeaderCommandAction[]>[
      Object.assign<HeaderCommandAction>({}, this.demoAlertItem, { id: `${ this.demoAlertItem.id }-admin`, commandParameter: 'Admin Menu Item' }),
    ];
  }

  getUserMenuItems() {
    return <HeaderCommandAction[]>[
      Object.assign<HeaderCommandAction>({}, this.demoAlertItem, { id: `${ this.demoAlertItem.id }-user`, commandParameter: 'User Menu Item' }),
    ];
  }

  getTitle() {
    let title: string;
    const component = this.component() as BaseRoutableViewModel<any>;

    if (component == null) {
      title = 'No Routed Component';
    }
    else if (typeof component === 'string') {
      title = (<string>component).toString();
    }
    else if (component.getTitle instanceof Function) {
      title = component.getTitle();
    }
    else {
      title = Object.getName(component);
    }

    return `Demo: ${ title }`;
  }
}
